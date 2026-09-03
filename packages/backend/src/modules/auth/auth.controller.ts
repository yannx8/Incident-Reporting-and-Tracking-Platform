import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  joinCode: z.string().min(1)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '1d' });
};

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    }

    const { email, password, displayName, joinCode } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { code: joinCode }
    });

    if (!invitation) {
      return res.status(400).json({ error: 'Invalid join code' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Join code has expired' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        memberships: {
          create: {
            organizationId: invitation.organizationId,
            role: 'USER',
            isActive: false 
          }
        }
      },
      include: {
        memberships: true
      }
    });

    const membership = user.memberships[0];
    if (!membership) {
      throw new Error('Membership was not created');
    }

    await prisma.auditEvent.create({
      data: {
        eventType: 'MEMBER_REGISTERED',
        organizationId: membership.organizationId,
        actorId: user.id,
        metadata: { role: membership.role }
      }
    });

    // Generate a temporary verification token (in a real app this goes to email)
    const verificationToken = jwt.sign(
      { membershipId: membership.id }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '24h' }
    );

    const safeMemberships = user.memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      isActive: m.isActive
    }));

    return res.status(201).json({
      message: 'Registration successful. Account pending verification.',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        memberships: safeMemberships
      },
      verificationToken // returned for MVP testing purposes since we don't have email
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hasActiveMembership = user.memberships.some((m) => m.isActive);
    if (!hasActiveMembership) {
      return res.status(403).json({ error: 'Account pending verification' });
    }

    const token = generateToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    const safeMemberships = user.memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      isActive: m.isActive
    }));

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        memberships: safeMemberships
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  return res.status(200).json({ message: 'Logout successful' });
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { memberships: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const safeMemberships = user.memberships.map((m) => ({
    organizationId: m.organizationId,
    role: m.role,
    isActive: m.isActive
  }));

  return res.status(200).json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    memberships: safeMemberships
  });
};

const verifySchema = z.object({
  token: z.string()
});

export const verify = async (req: Request, res: Response) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const { token } = parsed.data;
    const secret = process.env.JWT_SECRET as string;

    let decoded;
    try {
      decoded = jwt.verify(token, secret) as { membershipId: string };
    } catch {
      return res.status(401).json({ error: 'Invalid or expired verification token' });
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: { id: decoded.membershipId },
      include: { user: true }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (membership.isActive) {
      return res.status(200).json({ message: 'Account is already verified' });
    }

    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { isActive: true }
    });

    await prisma.auditEvent.create({
      data: {
        eventType: 'MEMBER_VERIFIED',
        organizationId: membership.organizationId,
        actorId: membership.userId,
        metadata: { role: membership.role }
      }
    });

    return res.status(200).json({ message: 'Account verified successfully. You may now log in.' });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
