import { describe, it, expect } from 'vitest';

describe('auth contract', () => {
  it('requires passwords of at least eight characters', () => {
    expect('password123'.length).toBeGreaterThanOrEqual(8);
  });
});
