import { PrismaClient, type User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateResetToken,
  hashResetToken,
  TOKEN_CONFIG,
} from './token.service.js';
import { AppError, ConflictError, NotFoundError, UnauthenticatedError, ValidationError } from '../../lib/errors.js';

export interface PublicMembership {
  organizationId: string;
  role: string;
  isActive: boolean;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  memberships: PublicMembership[];
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function toPublicUser(user: User & { memberships: Array<{ organizationId: string; role: string; isActive: boolean }> }): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    memberships: user.memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      isActive: m.isActive,
    })),
  };
}

/**
 * AuthService handles user registration, identity verification, authentication,
 * session token lifecycle management, and password recovery workflows.
 */
export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Registers a new user account linked to an organization via a valid join code.
   * Creates an inactive organization membership pending email/code verification.
   * 
   * @param input Account registration parameters including credentials and joinCode.
   * @returns The created user profile and a 24-hour verification token.
   * @throws {ValidationError} If input fields fail length/format requirements or joinCode is invalid/expired.
   * @throws {ConflictError} If a user with the specified email already exists.
   */
  async register(input: { email: string; password: string; displayName: string; joinCode: string }): Promise<{ user: PublicUser; verificationToken: string }> {
    if (input.email.length < 3 || input.password.length < 8 || input.displayName.length < 2) {
      throw new ValidationError([
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password must be at least 8 characters' },
        { field: 'displayName', message: 'Display name is required' },
      ]);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new ConflictError('CONFLICT', 'A user with this email already exists');
    }

    const invitation = await this.prisma.organizationInvitation.findUnique({ where: { code: input.joinCode } });
    if (!invitation) {
      throw new ValidationError([{ field: 'joinCode', message: 'Invalid join code' }]);
    }
    if (invitation.expiresAt < new Date()) {
      throw new ValidationError([{ field: 'joinCode', message: 'Join code has expired' }]);
    }

    // Cost factor 10 provides optimal balance between resistance to brute-force attacks and server performance.
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
        memberships: {
          create: {
            organizationId: invitation.organizationId,
            role: 'USER',
            isActive: false,
          },
        },
      },
      include: { memberships: true },
    });

    const membership = user.memberships[0];
    if (!membership) {
      throw new AppError('INTERNAL_ERROR', 'Membership was not created', 500);
    }

    await this.prisma.auditEvent.create({
      data: {
        eventType: 'MEMBER_REGISTERED',
        organizationId: membership.organizationId,
        actorId: user.id,
        metadata: { role: membership.role },
      },
    });

    const verificationToken = await this.createVerificationToken(membership.id);

    return { user: toPublicUser(user), verificationToken };
  }

  /**
   * Verifies an organization membership using a signed JWT verification token.
   * 
   * @param input Object containing the verification JWT token.
   * @returns Confirmation message string.
   * @throws {UnauthenticatedError} If token is invalid or expired.
   * @throws {NotFoundError} If corresponding membership record is not found.
   */
  async verify(input: { token: string }): Promise<{ message: string }> {
    const { default: jwt } = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('INTERNAL_ERROR', 'JWT_SECRET is not configured', 500);
    }

    let decoded: { membershipId: string };
    try {
      decoded = jwt.verify(input.token, secret) as { membershipId: string };
    } catch {
      throw new UnauthenticatedError('Invalid or expired verification token');
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: { id: decoded.membershipId },
    });

    if (!membership) {
      throw new NotFoundError('Membership');
    }

    if (membership.isActive) {
      return { message: 'Account is already verified' };
    }

    await this.prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { isActive: true },
    });

    await this.prisma.auditEvent.create({
      data: {
        eventType: 'MEMBER_VERIFIED',
        organizationId: membership.organizationId,
        actorId: membership.userId,
        metadata: { role: membership.role },
      },
    });

    return { message: 'Account verified successfully. You may now log in.' };
  }

  private async createVerificationToken(membershipId: string): Promise<string> {
    const { default: jwt } = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('INTERNAL_ERROR', 'JWT_SECRET is not configured', 500);
    }
    return jwt.sign({ membershipId }, secret, { expiresIn: '24h' });
  }

  /**
   * Authenticates user credentials and issues short-lived access and long-lived refresh tokens.
   * 
   * @param input Credentials containing email and password.
   * @returns Authenticated user profile and session token details.
   * @throws {UnauthenticatedError} If email or password is incorrect.
   * @throws {AppError} ACCOUNT_UNVERIFIED if account is pending verification.
   */
  async login(input: { email: string; password: string }): Promise<{ user: PublicUser; tokens: SessionTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { memberships: true },
    });

    if (!user) {
      throw new UnauthenticatedError('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthenticatedError('Invalid credentials');
    }

    const hasActiveMembership = user.memberships.some((m) => m.isActive);
    if (!hasActiveMembership) {
      throw new AppError('ACCOUNT_UNVERIFIED', 'Account pending verification', 403);
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + TOKEN_CONFIG.refreshTokenTtlMs);

    // Refresh token raw secret is hashed before DB storage to limit scope if DB leaks.
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      user: toPublicUser(user),
      tokens: { accessToken, refreshToken, refreshTokenExpiresAt },
    };
  }

  /**
   * Revokes an active refresh token session.
   * 
   * @param refreshToken Optional raw refresh token string to revoke.
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const tokenHash = hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Fetches the current user profile by user ID.
   * 
   * @param userId Unique identifier of the authenticated user.
   * @returns Public user structure including active organization memberships.
   * @throws {NotFoundError} If the user profile does not exist.
   */
  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });
    if (!user) {
      throw new NotFoundError('User');
    }
    return toPublicUser(user);
  }

  /**
   * Rotates a refresh token session, revoking the used token and issuing a new pair.
   * 
   * @param input Object containing current raw refresh token.
   * @returns New access and refresh token pair with expiration date.
   * @throws {UnauthenticatedError} If token is missing, expired, revoked, or reused.
   */
  async refresh(input: { refreshToken: string }): Promise<{ accessToken: string; refreshToken: string; refreshTokenExpiresAt: Date }> {
    const tokenHash = hashRefreshToken(input.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthenticatedError('Invalid or expired refresh token');
    }

    // Reuse detection: If token was already replaced, flag potential theft.
    if (stored.replacedByTokenId) {
      throw new UnauthenticatedError('Refresh token reuse detected');
    }

    const accessToken = signAccessToken(stored.userId);
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + TOKEN_CONFIG.refreshTokenTtlMs);

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: hashRefreshToken(newRefreshToken),
          expiresAt: refreshTokenExpiresAt,
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { replacedByTokenId: hashRefreshToken(newRefreshToken), revokedAt: new Date() },
      }),
    ]);

    return { accessToken, refreshToken: newRefreshToken, refreshTokenExpiresAt };
  }

  /**
   * Initiates password reset for a registered user.
   * Returns empty object if user is not found to prevent user enumeration attacks.
   * 
   * @param input Email of target account.
   * @returns Optional resetToken string if user exists.
   */
  async forgotPassword(input: { email: string }): Promise<{ resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      // Prevents account enumeration by returning identical outer signature regardless of account existence.
      return {};
    }

    const resetToken = generateResetToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(resetToken),
        expiresAt: new Date(Date.now() + TOKEN_CONFIG.resetTokenTtlMs),
      },
    });

    return { resetToken };
  }

  /**
   * Resets a user password using a valid reset token and invalidates all active sessions.
   * 
   * @param input Token string and desired new password.
   * @throws {ValidationError} If new password fails security rules or token is invalid/expired.
   */
  async resetPassword(input: { token: string; newPassword: string }): Promise<void> {
    if (input.newPassword.length < 8) {
      throw new ValidationError([{ field: 'newPassword', message: 'New password must be at least 8 characters' }]);
    }

    const tokenHash = hashResetToken(input.token);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
      throw new ValidationError([{ field: 'token', message: 'Invalid or expired reset token' }]);
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);

    // Invalidate password reset token AND revoke all active refresh tokens for safety upon credential change.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
