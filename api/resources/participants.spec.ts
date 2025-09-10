// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createApp } from '../app';
import supertest from 'supertest';
import { localRequest } from '../test-utils';

delete process.env.AUTH_JWT_SECRET;

describe('participants resource', () => {
  const handler = createApp();

  it('lists, creates, updates and deletes participants', async () => {
    const get = async (path: string) => process.env.NO_LISTEN ? (await localRequest(handler as any, 'GET', path)).json : (await supertest(handler).get(path).expect(200)).body;
    const post = async (path: string, body: any) => process.env.NO_LISTEN ? (await localRequest(handler as any, 'POST', path, body)).json : (await supertest(handler).post(path).send(body).expect(201)).body;
    const patch = async (path: string, body: any) => process.env.NO_LISTEN ? (await localRequest(handler as any, 'PATCH', path, body)).json : (await supertest(handler).patch(path).send(body).expect(200)).body;
    const del = async (path: string) => process.env.NO_LISTEN ? (await localRequest(handler as any, 'DELETE', path)).status : (await supertest(handler).delete(path).expect(204)).status;

    const list1 = await get('/participants');
    expect(Array.isArray(list1)).toBe(true);
    const before = list1.length;

    const created = await post('/participants', { name: 'Alice', income: 1000 });
    expect(created.name).toBe('Alice');

    const updated = await patch(`/participants/${created.id}`, { income: 1200 });
    expect(updated.income).toBe(1200);

    await del(`/participants/${created.id}`);
    const list2 = await get('/participants');
    expect(list2.length).toBe(before);
  });
});