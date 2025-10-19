// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createApp } from '../app';
import supertest from 'supertest';
import { localRequest } from '../test-utils';

delete process.env.AUTH_JWT_SECRET;
process.env.NO_LISTEN = '1';

describe('participants email uniqueness', () => {
  const handler = createApp();

  const post = async (path: string, body: any) => process.env.NO_LISTEN ? (await localRequest(handler as any, 'POST', path, body)).json : (await supertest(handler).post(path).send(body)).body;
  const postExpect = async (path: string, body: any, status: number) => process.env.NO_LISTEN ? (await localRequest(handler as any, 'POST', path, body)).status : (await supertest(handler).post(path).send(body).expect(status)).status;

  it('prevents creating two participants with same email', async () => {
    const email = 'unique@example.com';
    await post('/participants', { name: 'One', email, income: 100 });
    const status = await postExpect('/participants', { name: 'Two', email, income: 200 }, 409);
    expect(status).toBe(409);
  });
});
