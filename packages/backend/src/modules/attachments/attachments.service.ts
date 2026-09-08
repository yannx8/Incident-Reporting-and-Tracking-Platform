import { PrismaClient } from '@prisma/client';
import { AuthContext, canAccessIncident } from '../../authorization/index.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface AttachmentMetadata {
  id: string;
  incidentId: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  createdAt: Date;
}

/**
 * AttachmentsService manages binary attachment uploads, size/type validation,
 * presigned download link generation, and administrative file deletions.
 */
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly upload: (storageKey: string, body: Buffer, contentType: string) => Promise<void>,
    private readonly presign: (storageKey: string) => Promise<string>,
    private readonly deleteObject: (storageKey: string) => Promise<void>
  ) {}

  /**
   * Validates file MIME type and size limits before processing upload.
   * 
   * @param file Uploaded file metadata.
   * @throws {ValidationError} If file exceeds 5MB or uses unapproved MIME type.
   */
  validate(file: { originalname: string; mimetype: string; size: number }) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError([
        { field: 'file', message: 'Only image/jpeg, image/png, and image/webp are allowed' },
      ]);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError([{ field: 'file', message: 'File size must not exceed 5 MB' }]);
    }
  }

  /**
   * Uploads a file attachment to object storage and stores attachment metadata.
   * 
   * @param context Authenticated session context.
   * @param incidentId Incident UUID.
   * @param file Object containing original filename, MIME type, size, and binary buffer.
   * @returns Created attachment metadata database record.
   * @throws {NotFoundError} If incident is missing or unauthorized.
   * @throws {ForbiddenError} If incident is in CLOSED state.
   */
  async uploadAttachment(
    context: AuthContext,
    incidentId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer }
  ): Promise<AttachmentMetadata> {
    this.validate(file);

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, organizationId: context.organizationId },
    });
    if (!incident) {
      throw new NotFoundError('Incident');
    }
    if (incident.status === 'CLOSED') {
      throw new ForbiddenError('Cannot attach files to a closed incident');
    }
    if (!(await canAccessIncident(context, incident, this.prisma))) {
      throw new NotFoundError('Incident');
    }

    // Tenant-isolated storage path prevents key collision and cross-tenant object access.
    const storageKey = `${context.organizationId}/${incidentId}/${crypto.randomUUID()}`;

    await this.upload(storageKey, file.buffer, file.mimetype);

    const attachment = await this.prisma.attachment.create({
      data: {
        incidentId,
        uploaderId: context.userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        storageKey,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        organizationId: context.organizationId,
        incidentId,
        actorId: context.userId,
        eventType: 'ATTACHMENT_UPLOADED',
        metadata: { attachmentId: attachment.id, fileName: file.originalname },
      },
    });

    return attachment;
  }

  /**
   * Lists all attachments associated with an incident after verifying read permissions.
   * 
   * @param context Authenticated session context.
   * @param incidentId Incident UUID.
   * @returns Array of AttachmentMetadata records.
   */
  async listAttachments(context: AuthContext, incidentId: string): Promise<AttachmentMetadata[]> {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, organizationId: context.organizationId },
    });
    if (!incident) {
      throw new NotFoundError('Incident');
    }
    if (!(await canAccessIncident(context, incident, this.prisma))) {
      throw new NotFoundError('Incident');
    }

    return this.prisma.attachment.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generates a signed download URL for an attachment file.
   * 
   * @param context Authenticated session context.
   * @param incidentId Incident UUID.
   * @param attachmentId Attachment UUID.
   * @returns Object containing signed URL string and expiration time in seconds.
   */
  async getDownloadUrl(context: AuthContext, incidentId: string, attachmentId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, organizationId: context.organizationId },
    });
    if (!incident) {
      throw new NotFoundError('Incident');
    }
    if (!(await canAccessIncident(context, incident, this.prisma))) {
      throw new NotFoundError('Incident');
    }

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, incidentId },
    });
    if (!attachment) {
      throw new NotFoundError('Attachment');
    }

    const url = await this.presign(attachment.storageKey);
    return { url, expiresIn: 3600 };
  }

  /**
   * Deletes an attachment record and removes its underlying object from S3 storage.
   * Restricted to Administrators only.
   * 
   * @param context Authenticated session context (ADMINISTRATOR required).
   * @param incidentId Incident UUID.
   * @param attachmentId Attachment UUID.
   * @returns Success payload.
   * @throws {ForbiddenError} If user is not an Administrator.
   */
  async deleteAttachment(context: AuthContext, incidentId: string, attachmentId: string) {
    if (!context.roles.includes('ADMINISTRATOR')) {
      throw new ForbiddenError('Only administrators can delete attachments');
    }

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, organizationId: context.organizationId },
    });
    if (!incident) {
      throw new NotFoundError('Incident');
    }

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, incidentId },
    });
    if (!attachment) {
      throw new NotFoundError('Attachment');
    }

    await this.deleteObject(attachment.storageKey);

    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    await this.prisma.auditEvent.create({
      data: {
        organizationId: context.organizationId,
        incidentId,
        actorId: context.userId,
        eventType: 'ATTACHMENT_DELETED',
        metadata: { action: 'ATTACHMENT_DELETED', attachmentId },
      },
    });

    return { success: true };
  }
}