import { describe, it, expect } from 'vitest';
import { IncidentStatus } from '@prisma/client';
import {
  assertValidIncidentTransition,
  isLegalTargetStatus,
  isTerminal,
} from '../modules/incidents/incident-lifecycle.js';

describe('incident lifecycle state machine', () => {
  describe('valid transitions', () => {
    const cases: Array<[IncidentStatus, IncidentStatus]> = [
      ['NEW', 'ASSIGNED'],
      ['ASSIGNED', 'IN_PROGRESS'],
      ['IN_PROGRESS', 'RESOLVED'],
      ['RESOLVED', 'CLOSED'],
    ];

    it.each(cases)('allows %s -> %s', (from, to) => {
      expect(() => assertValidIncidentTransition(from, to)).not.toThrow();
    });

    it('allows reassignment while ASSIGNED (no state change)', () => {
      expect(() => assertValidIncidentTransition('ASSIGNED', 'ASSIGNED')).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const cases: Array<[IncidentStatus, IncidentStatus]> = [
      ['NEW', 'IN_PROGRESS'],
      ['NEW', 'RESOLVED'],
      ['NEW', 'CLOSED'],
      ['ASSIGNED', 'RESOLVED'],
      ['ASSIGNED', 'CLOSED'],
      ['IN_PROGRESS', 'CLOSED'],
      ['IN_PROGRESS', 'ASSIGNED'],
      ['RESOLVED', 'IN_PROGRESS'],
      ['RESOLVED', 'ASSIGNED'],
      ['CLOSED', 'NEW'],
      ['CLOSED', 'ASSIGNED'],
      ['CLOSED', 'RESOLVED'],
    ];

    it.each(cases)('rejects %s -> %s', (from, to) => {
      expect(() => assertValidIncidentTransition(from, to)).toThrowError(
        expect.objectContaining({
          code: 'INVALID_STATE_TRANSITION',
          statusCode: 409,
        })
      );
    });

    it('rejects idempotent transitions for non-ASSIGNED states', () => {
      expect(() => assertValidIncidentTransition('IN_PROGRESS', 'IN_PROGRESS')).toThrow();
      expect(() => assertValidIncidentTransition('RESOLVED', 'RESOLVED')).toThrow();
      expect(() => assertValidIncidentTransition('CLOSED', 'CLOSED')).toThrow();
      expect(() => assertValidIncidentTransition('NEW', 'NEW')).toThrow();
    });
  });

  describe('isLegalTargetStatus', () => {
    it('accepts legal next states', () => {
      expect(isLegalTargetStatus('NEW', 'ASSIGNED')).toBe(true);
      expect(isLegalTargetStatus('ASSIGNED', 'IN_PROGRESS')).toBe(true);
      expect(isLegalTargetStatus('IN_PROGRESS', 'RESOLVED')).toBe(true);
      expect(isLegalTargetStatus('RESOLVED', 'CLOSED')).toBe(true);
    });

    it('rejects illegal next states', () => {
      expect(isLegalTargetStatus('NEW', 'RESOLVED')).toBe(false);
      expect(isLegalTargetStatus('IN_PROGRESS', 'CLOSED')).toBe(false);
      expect(isLegalTargetStatus('CLOSED', 'NEW')).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('marks RESOLVED and CLOSED as terminal', () => {
      expect(isTerminal('RESOLVED')).toBe(true);
      expect(isTerminal('CLOSED')).toBe(true);
    });

    it('does not mark active states as terminal', () => {
      expect(isTerminal('NEW')).toBe(false);
      expect(isTerminal('ASSIGNED')).toBe(false);
      expect(isTerminal('IN_PROGRESS')).toBe(false);
    });
  });
});