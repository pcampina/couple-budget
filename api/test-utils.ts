import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

function makeReq(method: string, path: string, body?: unknown, headers?: Record<string, string>): IncomingMessage {
  const req = new Readable({ read() {} }) as unknown as IncomingMessage & Readable;
  (req as any).url = path;
  (req as any).method = method;
  const baseHeaders: Record<string, string> = { host: 'test' };
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      if (key) baseHeaders[key.toLowerCase()] = value;
    }
  }
  (req as any).headers = baseHeaders;
  process.nextTick(() => {
    if (body !== undefined) {
      const buf = typeof body === 'string' ? body : JSON.stringify(body);
      req.push(buf);
    }
    req.push(null);
  });
  return req;
}

function makeRes(): { res: ServerResponse; get: () => { status: number; headers: any; raw: string; json?: any }; done: Promise<void> } {
  let status = 200; let headers: any = {}; let data = '';
  let resolve!: () => void; const done = new Promise<void>(r => (resolve = r));
  const res = {
    writeHead: (s: number, h?: any) => { status = s; headers = h || {}; },
    end: (b?: any) => { data = b ? String(b) : ''; resolve(); },
  } as unknown as ServerResponse;
  return { res, get: () => ({ status, headers, raw: data, json: data ? JSON.parse(data) : undefined }), done };
}

export async function localRequest(
  handler: (req: IncomingMessage, res: ServerResponse) => unknown | Promise<unknown>,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const req = makeReq(method, path, body, headers);
  const { res, get, done } = makeRes();
  await handler(req, res);
  await done;
  return get();
}
