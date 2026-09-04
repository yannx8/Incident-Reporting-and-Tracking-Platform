import { z } from 'zod';
import { OrgRole } from '@prisma/client';

export const CreateMembershipSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  role: z.nativeEnum(OrgRole),
});

export const UpdateMembershipSchema = z.object({
  isActive: z.boolean(),
});

export const CreateResponsableProfileSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  phone: z.string().optional(),
});

export const AssignSiteToResponsableSchema = z.object({
  siteId: z.string().uuid('Invalid site ID format'),
});
