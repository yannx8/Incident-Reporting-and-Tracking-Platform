import { z } from 'zod';

export const createIncidentSchema = z.object({
  siteId: z.string().uuid('Invalid site ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const triageIncidentSchema = z.object({
  classificationNotes: z.string().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  requiredSpecialtyId: z.string().uuid('Invalid specialty ID').optional()
});

export type TriageIncidentInput = z.infer<typeof triageIncidentSchema>;