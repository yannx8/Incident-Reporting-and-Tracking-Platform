import { z } from 'zod';

export const incidentParamsSchema = z.object({
  id: z.string().uuid('Invalid incident ID'),
});

export const attachmentParamsSchema = z.object({
  id: z.string().uuid('Invalid incident ID'),
  attachmentId: z.string().uuid('Invalid attachment ID'),
});