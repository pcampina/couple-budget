import type { IncomingMessage, ServerResponse } from 'node:http';
import { send } from './utils';
import crypto from 'node:crypto';
import { userRepo } from './repositories/userRepo';
import { Role } from './types/domain';

type JwtPayload = {
  sub?: string;
  role?: string;
  app_metadata?: { roles?: string[] };
  exp?: number;
  nbf?: number;
  iat?: number;
  [k: string]: unknown;
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

export function verifyHS256(token: string, secret: string): JwtPayload | null {
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

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function signHS256(payload: JwtPayload, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64urlEncode(Buffer.from(JSON.stringify(header)));
  const p = b64urlEncode(Buffer.from(JSON.stringify(payload)));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  const s = b64urlEncode(sig);
  return `${data}.${s}`;
}

function extractRole(payload: JwtPayload): 'admin' | 'user' | 'authenticated' | undefined {
  const roles = payload.app_metadata?.roles || [];
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('user')) return 'user';
  if (payload.role === 'authenticated') return 'authenticated';
  return undefined;
}

export function withAuth(
  minRole: 'user' | 'admin',
  handler: (req: IncomingMessage, res: ServerResponse, params: Record<string, string>, search: URLSearchParams) => unknown | Promise<unknown>
) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string> = {},
    search: URLSearchParams = new URLSearchParams()
  ) => {
    const secret = process.env.AUTH_JWT_SECRET; // JWT secret
    if (!secret) {
      // Dev mode: try to parse token payload without verifying, so downstream has user info
      try {
        const auth = String(req.headers['authorization'] || '');
        const m = auth.match(/^Bearer\s+(.+)$/i);
        if (m) {
          const parts = m[1].split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(b64urlDecode(parts[1]).toString('utf-8')) as JwtPayload;
            const r = extractRole(payload);
            const mapped: Role | 'authenticated' | undefined = r === 'admin' ? Role.Admin : r === 'user' ? Role.User : 'authenticated';
            req.user = { id: (payload.sub as string) || 'dev-user', role: mapped, email: (payload as { email?: string })?.email };
          }
        }
      } catch {}
      return handler(req, res, params, search);
    }
    const auth = String(req.headers['authorization'] || '');
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return send(res, 401, { error: 'Missing bearer token' });
    const payload = verifyHS256(m[1], secret);
    if (!payload) return send(res, 401, { error: 'Invalid token' });
    const role = extractRole(payload);
    // Backfill email if missing in token (for legacy tokens)
    let email = (payload as { email?: string })?.email as string | undefined;
    if (!email && payload.sub) {
      try {
        const repo = userRepo();
        const byId = await repo.findById(payload.sub);
        email = (byId && byId.email) || email;
      } catch {}
    }
    if (minRole === 'admin') {
      if (role !== 'admin') return send(res, 403, { error: 'Forbidden' });
    } else {
      const hasMinimalAccess = role === 'admin' || role === 'user' || payload.role === 'authenticated' || !!payload.sub;
      if (!hasMinimalAccess) return send(res, 403, { error: 'Forbidden' });
    }
    // Attach auth to request for downstream if needed
    const mappedRole: Role | 'authenticated' | undefined = role === 'admin' ? Role.Admin : role === 'user' ? Role.User : 'authenticated';
    req.user = { id: payload.sub, role: mappedRole, email };
    return handler(req, res, params, search);
  };
}
