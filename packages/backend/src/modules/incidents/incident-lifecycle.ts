import { IncidentStatus } from '@prisma/client';
import { AppError } from '../../lib/errors.js';

const allowed: Record<IncidentStatus, IncidentStatus[]> = {
  NEW: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: []
};

export function assertTransition(from: IncidentStatus, to: IncidentStatus) {
  if (!allowed[from].includes(to)) {
    throw new AppError('CONFLICT_STATE', 409, `Invalid transition ${from} -> ${to}`);
  }
}
