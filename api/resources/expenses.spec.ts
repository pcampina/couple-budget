// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createApp } from '../app.js';
process.env['NO_LISTEN'] = '1';
import supertest from 'supertest';
import { localRequest } from '../test-utils.js';

delete process.env['AUTH_JWT_SECRET'];

describe('expenses resource', () => {
  const handler = createApp();

  it('lists, creates, updates and deletes expenses', async () => {
    const get = async (path: string) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'GET', path)).json : (await supertest(handler).get(path).expect(200)).body;
    const post = async (path: string, body: any) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'POST', path, body)).json : (await supertest(handler).post(path).send(body).expect(201)).body;
    const patch = async (path: string, body: any) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'PATCH', path, body)).json : (await supertest(handler).patch(path).send(body).expect(200)).body;
    const del = async (path: string) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'DELETE', path)).status : (await supertest(handler).delete(path).expect(204)).status;

    // Ensure at least one participant exists
    const createP = async (name: string, income: number) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'POST', '/participants', { name, income })).json : (await supertest(handler).post('/participants').send({ name, income }).expect(201)).body;
    await createP('Alice', 1000);

    const list1 = await get('/expenses');
    const before = list1.length;

    const created = await post('/expenses', { name: 'Internet', total: 50 });
    expect(created.total).toBe(50);

    const updated = await patch(`/expenses/${created.id}`, { total: 60 });
    expect(updated.total).toBe(60);

    await del(`/expenses/${created.id}`);
    const list2 = await get('/expenses');
    expect(list2.length).toBe(before);
  });

  it('supports pagination when querying expenses', async () => {
    const get = async (path: string) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'GET', path)).json : (await supertest(handler).get(path).expect(200)).body;
    const post = async (path: string, body: any) => process.env['NO_LISTEN'] ? (await localRequest(handler as any, 'POST', path, body)).json : (await supertest(handler).post(path).send(body).expect(201)).body;
    // Add participant if none
    const ensureP = async () => {
      const ps = await get('/participants');
      if (!ps.length) {
        await (process.env['NO_LISTEN'] ? localRequest(handler as any, 'POST', '/participants', { name: 'Bob', income: 1000 }) : supertest(handler).post('/participants').send({ name: 'Bob', income: 1000 }).expect(201));
      }
    };
    await ensureP();
    // Seed 25 expenses
    for (let i = 0; i < 25; i++) await post('/expenses', { name: `E${i}`, total: i });
    const page1 = await get('/expenses?page=1&limit=20');
    expect(Array.isArray(page1.items)).toBe(true);
    expect(page1.items.length).toBe(20);
    expect(page1.total).toBeGreaterThanOrEqual(25);
    const page2 = await get('/expenses?page=2&limit=20');
    expect(page2.items.length).toBeGreaterThan(0);
  });
});
