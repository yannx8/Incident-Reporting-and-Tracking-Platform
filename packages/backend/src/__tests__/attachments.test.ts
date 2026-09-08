import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AttachmentsService } from '../modules/attachments/attachments.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { AuthContext } from '../authorization/index.js';

const prisma = new PrismaClient();

const adminContext: AuthContext = {
  userId: 'admin-user',
  organizationId: 'org-1',
  email: 'admin@test.com',
  roles: ['ADMINISTRATOR'] as AuthContext['roles'],
};

const userContext: AuthContext = {
  userId: 'user-1',
  organizationId: 'org-1',
  email: 'user@test.com',
  roles: ['USER'] as AuthContext['roles'],
};

describe('AttachmentsService', () => {
  const upload = vi.fn();
  const presign = vi.fn().mockResolvedValue('https://signed-url.example/file');
  const deleteObject = vi.fn();
  let service: AttachmentsService;

  beforeEach(() => {
    upload.mockReset();
    presign.mockReset().mockResolvedValue('https://signed-url.example/file');
    deleteObject.mockReset();
    service = new AttachmentsService(prisma, upload, presign, deleteObject);
  });

  describe('validate', () => {
    it('rejects unsupported mime types', () => {
      expect(() =>
        service.validate({ originalname: 'x.exe', mimetype: 'application/x-msdownload', size: 100 })
      ).toThrow(ValidationError);
    });

    it('rejects files larger than 5 MB', () => {
      expect(() =>
        service.validate({ originalname: 'x.png', mimetype: 'image/png', size: 6 * 1024 * 1024 })
      ).toThrow(ValidationError);
    });

    it('accepts valid images', () => {
      expect(() =>
        service.validate({ originalname: 'x.png', mimetype: 'image/png', size: 1024 })
      ).not.toThrow();
    });
  });

  describe('deleteAttachment', () => {
    it('rejects non-administrators', async () => {
      await expect(
        service.deleteAttachment(userContext, 'incident-1', 'attachment-1')
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('throws NotFoundError when incident is out of scope', async () => {
      vi.spyOn(prisma.incident, 'findFirst').mockResolvedValueOnce(null);
      await expect(
        service.deleteAttachment(adminContext, 'incident-1', 'attachment-1')
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError when attachment is missing', async () => {
      vi.spyOn(prisma.incident, 'findFirst').mockResolvedValueOnce({} as never);
      vi.spyOn(prisma.attachment, 'findFirst').mockResolvedValueOnce(null);
      await expect(
        service.deleteAttachment(adminContext, 'incident-1', 'attachment-1')
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('deletes the object and record, and writes an audit event', async () => {
      vi.spyOn(prisma.incident, 'findFirst').mockResolvedValueOnce({} as never);
      vi.spyOn(prisma.attachment, 'findFirst').mockResolvedValueOnce({
        id: 'attachment-1',
        storageKey: 'org-1/incident-1/key',
      } as never);
      const deleteSpy = vi.spyOn(prisma.attachment, 'delete').mockResolvedValue({} as never);
      const auditSpy = vi.spyOn(prisma.auditEvent, 'create').mockResolvedValue({} as never);

      const result = await service.deleteAttachment(adminContext, 'incident-1', 'attachment-1');

      expect(result).toEqual({ success: true });
      expect(deleteObject).toHaveBeenCalledWith('org-1/incident-1/key');
      expect(deleteSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ eventType: 'ATTACHMENT_DELETED' }) })
      );
    });
  });
});