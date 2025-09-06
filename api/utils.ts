import type { ServerResponse, IncomingHttpHeaders } from 'node:http';
import { randomUUID } from 'node:crypto';

export function uuid(): string { return randomUUID(); }

export function send<T>(res: ServerResponse, status: number, data?: T, headers: IncomingHttpHeaders = {} as any): void {
  let body = '';
  if (data !== undefined) {
    if (typeof data === 'string' || (globalThis as any).Buffer?.isBuffer?.(data)) {
      body = data as any;
    } else {
      body = JSON.stringify(data);
    }
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(headers as any),
  } as any);
  res.end(body);
}

export async function readJson<T = any>(req: NodeJS.ReadableStream): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {} as T;
  const raw = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(raw) as T;
}
