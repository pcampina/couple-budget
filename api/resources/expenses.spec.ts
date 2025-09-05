// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createApp } from '../app';
import request from 'supertest';

describe('expenses resource', () => {
  const handler = createApp();

  it('lists, creates, updates and deletes expenses', async () => {
    const list1 = (await request(handler).get('/expenses').expect(200)).body;
    const before = list1.length;

    const created = (await request(handler).post('/expenses').send({ name: 'Internet', total: 50 }).expect(201)).body;
    expect(created.total).toBe(50);

    const updated = (await request(handler).patch(`/expenses/${created.id}`).send({ total: 60 }).expect(200)).body;
    expect(updated.total).toBe(60);

    await request(handler).delete(`/expenses/${created.id}`).expect(204);
    const list2 = (await request(handler).get('/expenses').expect(200)).body;
    expect(list2.length).toBe(before);
  });
});
