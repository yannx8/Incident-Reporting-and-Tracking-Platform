import { IncidentStatus } from '@prisma/client';
import { ConflictError } from '../../lib/errors.js';

type TransitionMap = Partial<Record<IncidentStatus, IncidentStatus[]>>;

const VALID_TRANSITIONS: TransitionMap = {
  NEW: ['ASSIGNED'],
  ASSIGNED: ['ASSIGNED', 'IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export const INCIDENT_STATUSES: IncidentStatus[] = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

/**
 * Asserts that transitioning from `currentStatus` to `nextStatus` is legal.
 * Throws a 409 INVALID_STATE_TRANSITION otherwise.
 */
export function assertValidIncidentTransition(currentStatus: IncidentStatus, nextStatus: IncidentStatus): void {
  if (currentStatus === nextStatus && currentStatus === 'ASSIGNED') {
    return;
  }

  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new ConflictError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition from ${currentStatus} to ${nextStatus}`
    );
  }
}

/**
 * A transition is applicable only when an incident is in a state that can move
 * to the target state. Returns true when the target is reachable without
 * changing states (idempotent operations) or is a legal downstream state.
 */
export function isLegalTargetStatus(currentStatus: IncidentStatus, target: IncidentStatus): boolean {
  if (currentStatus === target) {
    return target === 'ASSIGNED';
  }
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  return allowed.includes(target);
}

export function isTerminal(status: IncidentStatus): boolean {
  return status === 'RESOLVED' || status === 'CLOSED';
}