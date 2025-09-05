// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createApp } from '../app';
import request from 'supertest';

describe('stats resource', () => {
  const handler = createApp();

  it('returns consistent totals', async () => {
    const stats = (await request(handler).get('/stats').expect(200)).body;
    expect(stats.totalIncome).toBeGreaterThan(0);
    expect(stats.totalExpenses).toBeGreaterThan(0);
    const sumAlloc = Object.values(stats.totalsPerParticipant).reduce((a: number, b: number) => a + b, 0);
    expect(Math.abs(sumAlloc - stats.totalExpenses)).toBeLessThan(0.001);
  });
});
