import type { ServerResponse, IncomingHttpHeaders } from 'node:http';

export function uuid(): string {
  try {
    // Prefer native UUID when available
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
  } catch {}
  // Fallback RFC4122 v4-like
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

export function send<T>(res: ServerResponse, status: number, data?: T, headers: IncomingHttpHeaders = {} as any): void {
  const body = data === undefined ? '' : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
