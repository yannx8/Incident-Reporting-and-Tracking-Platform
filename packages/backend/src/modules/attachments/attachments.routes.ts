import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../../lib/prisma.js';
import { getObjectStorage } from '../../lib/storage.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrganization } from '../../middleware/requireOrganization.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateParams } from '../../lib/validation.js';
import { UnauthenticatedError } from '../../lib/errors.js';
import { AttachmentsService } from './attachments.service.js';
import { incidentParamsSchema, attachmentParamsSchema } from './attachments.schema.js';

const storage = getObjectStorage();
const attachmentsService = new AttachmentsService(
  prisma,
  (key, body, contentType) => storage.upload(key, body, contentType),
  (key) => storage.getSignedDownloadUrl(key),
  (key) => storage.delete(key)
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const requireContext = (req: Request): NonNullable<typeof req.authContext> => {
  if (!req.authContext) {
    throw new UnauthenticatedError();
  }
  return req.authContext;
};

export const attachmentsRouter: Router = Router();

attachmentsRouter.use(authenticate);
attachmentsRouter.use(requireOrganization);

attachmentsRouter.post(
  '/incidents/:id/attachments',
  validateParams(incidentParamsSchema),
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const context = requireContext(req);
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'INVALID_FILE', message: 'A file is required' },
      });
    }
    const attachment = await attachmentsService.uploadAttachment(context, req.params.id as string, req.file);
    return res.status(201).json({ data: attachment });
  })
);

attachmentsRouter.get(
  '/incidents/:id/attachments',
  validateParams(incidentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const context = requireContext(req);
    const attachments = await attachmentsService.listAttachments(context, req.params.id as string);
    return res.status(200).json({ data: attachments });
  })
);

attachmentsRouter.get(
  '/incidents/:id/attachments/:attachmentId/download',
  validateParams(attachmentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const context = requireContext(req);
    const result = await attachmentsService.getDownloadUrl(
      context,
      req.params.id as string,
      req.params.attachmentId as string
    );
    return res.status(200).json({ data: result });
  })
);

attachmentsRouter.delete(
  '/incidents/:id/attachments/:attachmentId',
  validateParams(attachmentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const context = requireContext(req);
    const result = await attachmentsService.deleteAttachment(
      context,
      req.params.id as string,
      req.params.attachmentId as string
    );
    return res.status(200).json({ data: result });
  })
);