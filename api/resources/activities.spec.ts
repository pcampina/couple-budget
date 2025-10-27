// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import supertest from 'supertest';
import { localRequest } from '../test-utils.js';

delete process.env['AUTH_JWT_SECRET'];

describe('activities resource', () => {
  const handler = createApp();

  it('returns paginated activities for the current user', async () => {
    const get = async (path: string) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'GET', path)).json : (await supertest(handler).get(path).expect(200)).body;
    const post = async (path: string, body: any) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'POST', path, body)).json : (await supertest(handler).post(path).send(body).expect(201)).body;

    // Seed: ensure participant and create a few expenses to generate activity
    await post('/participants', { name: 'User', income: 1000 });
    for (let i = 0; i < 5; i++) await post('/expenses', { name: `A${i}`, total: i });

    const page1 = await get('/activities?page=1&limit=20');
    expect(Array.isArray(page1.items)).toBe(true);
    expect(page1.items.length).toBeGreaterThan(0);
    expect(typeof page1.total).toBe('number');
  });
});
