import { z } from 'zod';

export const categories = [
  'LIGHTING',
  'PLUMBING',
  'SECURITY',
  'FURNITURE',
  'ROAD',
  'EQUIPMENT',
  'HVAC',
  'OTHER'
] as const;

export const createIncident = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().min(10).max(5000),
  category: z.enum(categories),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  siteId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const comment = z.object({
  body: z.string().trim().min(1).max(2000)
});

export const resolution = z.object({
  resolutionText: z.string().trim().min(10).max(3000)
});

export const reject = z.object({
  reason: z.string().trim().min(5).max(500)
});
