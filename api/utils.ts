import type { ServerResponse, OutgoingHttpHeaders } from 'node:http';
import { randomUUID } from 'node:crypto';

export function uuid(): string { return randomUUID(); }

export function send<T>(
  res: ServerResponse,
  status: number,
  data?: T,
  headers: OutgoingHttpHeaders = {}
): void {
  let body = '';
  if (data !== undefined) {
    if (typeof data === 'string' || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data as unknown as Buffer))) {
      body = data as unknown as string;
    } else {
      body = JSON.stringify(data);
    }
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers,
  });
  res.end(body);
}

export async function readJson<T = unknown>(req: NodeJS.ReadableStream): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {} as T;
  const raw = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(raw) as T;
}
