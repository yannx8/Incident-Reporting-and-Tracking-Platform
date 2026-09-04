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

// Assignment Acceptance
export const updateAssignmentStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REASSIGNMENT_REQUESTED']),
  reason: z.string().optional()
});

// Progress Updates
export const createProgressUpdateSchema = z.object({
  type: z.enum(['PROGRESS', 'BLOCKED', 'WORK_COMPLETED']),
  content: z.string().min(1, 'Content is required')
});

// Incident Comments
export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body cannot be empty')
});

// Advanced Listing
export const listIncidentsQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  priority: z.string().transform(v => parseInt(v, 10)).optional(),
  category: z.string().optional(),
  reporterId: z.string().uuid().optional(),
  assignedToMe: z.string().transform(v => v === 'true').optional(),
  search: z.string().optional()
});