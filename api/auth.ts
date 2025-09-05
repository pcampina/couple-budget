import type { IncomingMessage, ServerResponse } from 'node:http';
import { send } from './utils';
import crypto from 'node:crypto';

type JwtPayload = {
  sub?: string;
  role?: string;
  app_metadata?: { roles?: string[] };
  exp?: number;
  nbf?: number;
  iat?: number;
  [k: string]: any;
};

function b64urlDecode(input: string): Buffer {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad) input += '='.repeat(4 - pad);
  return Buffer.from(input, 'base64');
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyHS256(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const sig = b64urlDecode(s);
  const expected = crypto.createHmac('sha256', secret).update(data).digest();
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(p).toString('utf-8')) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now >= payload.exp) return null;
    if (payload.nbf && now < payload.nbf) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractRole(payload: JwtPayload): 'admin' | 'user' | 'authenticated' | undefined {
  const roles = payload.app_metadata?.roles || [];
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('user')) return 'user';
  if (payload.role === 'authenticated') return 'authenticated';
  return undefined;
}

export function withAuth<P extends any[]>(
  minRole: 'user' | 'admin',
  handler: (req: IncomingMessage, res: ServerResponse, ...rest: P) => unknown | Promise<unknown>
) {
  return async (req: IncomingMessage, res: ServerResponse, ...rest: P) => {
    const secret = process.env.AUTH_JWT_SECRET; // Supabase JWT secret
    if (!secret) {
      // Auth disabled — allow all in development/testing
      return handler(req, res, ...rest);
    }
    const auth = String(req.headers['authorization'] || '');
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return send(res, 401, { error: 'Missing bearer token' });
    const payload = verifyHS256(m[1], secret);
    if (!payload) return send(res, 401, { error: 'Invalid token' });
    const role = extractRole(payload);
    if (minRole === 'admin') {
      if (role !== 'admin') return send(res, 403, { error: 'Forbidden' });
    } else {
      if (!role && payload.role !== 'authenticated') return send(res, 403, { error: 'Forbidden' });
    }
    // Attach auth to request for downstream if needed
    (req as any).user = { id: payload.sub, role };
    return handler(req, res, ...rest);
  };
}
