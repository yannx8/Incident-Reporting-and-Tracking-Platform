import { describe, it, expect } from 'vitest';
import { hasRole } from '../authorization/index.js';

describe('authorization', () => {
  it('keeps overlapping roles explicit', () => {
    expect(hasRole(['USER', 'RESPONSABLE'], 'RESPONSABLE')).toBe(true);
    expect(hasRole(['USER'], 'RESPONSABLE')).toBe(false);
    expect(hasRole(['USER', 'RESPONSABLE'], 'ADMINISTRATOR')).toBe(false);
  });
});
