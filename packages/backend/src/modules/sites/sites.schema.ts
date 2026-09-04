import { z } from 'zod';

export const CreateSiteSchema = z.object({
  name: z.string().min(1, 'Site name is required'),
  address: z.string().optional(),
});

export const UpdateSiteSchema = z.object({
  name: z.string().min(1, 'Site name is required').optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});
