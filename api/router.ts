import { send } from './utils';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
  search: URLSearchParams
) => unknown | Promise<unknown>;

function compilePath(pattern: string): RegExp {
  const re = pattern.replace(/:[^/]+/g, m => `(?<${m.slice(1)}>[^/]+)`);
  return new RegExp(`^${re}$`);
}

interface Route { method: string; re: RegExp; handler: Handler }

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: Handler): void {
    this.routes.push({ method: method.toUpperCase(), re: compilePath(path), handler });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'OPTIONS') return send(res, 204);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = url.pathname.match(r.re);
      if (m) {
        const params = (m.groups || {}) as Record<string, string>;
        try {
          await r.handler(req, res, params, url.searchParams);
          return;
        } catch (err) {
          console.error('Route error:', err);
          return send(res, 500, { error: 'Internal error' });
        }
      }
    }
    return send(res, 404, { error: 'Route not found' });
  }
}
