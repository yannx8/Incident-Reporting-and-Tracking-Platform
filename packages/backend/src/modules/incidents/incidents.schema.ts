import { z } from 'zod';

export const createIncidentSchema = z.object({
  siteId: z.string().uuid('Invalid site ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
