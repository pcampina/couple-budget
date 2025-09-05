// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createApp } from '../app';
import request from 'supertest';

describe('participants resource', () => {
  const handler = createApp();

  it('lists, creates, updates and deletes participants', async () => {
    const list1 = (await request(handler).get('/participants').expect(200)).body;
    expect(Array.isArray(list1)).toBe(true);
    const before = list1.length;

    const created = (await request(handler).post('/participants').send({ name: 'Alice', income: 1000 }).expect(201)).body;
    expect(created.name).toBe('Alice');

    const updated = (await request(handler).patch(`/participants/${created.id}`).send({ income: 1200 }).expect(200)).body;
    expect(updated.income).toBe(1200);

    await request(handler).delete(`/participants/${created.id}`).expect(204);
    const list2 = (await request(handler).get('/participants').expect(200)).body;
    expect(list2.length).toBe(before);
  });
});
