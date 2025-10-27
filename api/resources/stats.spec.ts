// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createApp } from '../app.js';
import supertest from 'supertest';
import { localRequest } from '../test-utils.js';

delete process.env['AUTH_JWT_SECRET'];

describe('stats resource', () => {
  const handler = createApp();

  it('returns consistent totals (sum allocations == total expenses)', async () => {
    const get = async (path: string) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'GET', path)).json : (await supertest(handler).get(path).expect(200)).body;
    const stats = await get('/stats');
    expect(stats.totalIncome).toBeGreaterThanOrEqual(0);
    expect(stats.totalTransactions).toBeGreaterThanOrEqual(0);
    const sumAlloc = Object.values(stats.totalsPerParticipant as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    expect(Math.abs(sumAlloc - stats.totalTransactions)).toBeLessThan(0.001);
  });
});
