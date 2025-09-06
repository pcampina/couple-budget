import { send } from '../utils';
import type { Router } from '../router';
import { userRepo } from '../repositories/userRepo';
import { signHS256 } from '../auth';

function ensureSecret(): string {
  return process.env.AUTH_JWT_SECRET || 'dev-secret';
}

export function registerAuth(router: Router): void {
  router.add('POST', '/auth/register', async (req, res) => {
    try {
      const body = await (await import('../utils')).readJson<{ email?: string; name?: string; password?: string }>(req);
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim() || email.split('@')[0] || 'User';
      const password = String(body.password || '');
      if (!email || !password) return send(res, 400, { error: 'Email and password are required' });
      const repo = userRepo();
      const u = await repo.createUser(email, name, password, 'user');
      return send(res, 201, { id: u.id, email: u.email, name: u.name, role: u.role });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if ((e as any)?.code === '23505' || /unique/i.test(msg)) return send(res, 409, { error: 'Email already exists' });
      return send(res, 500, { error: 'Unable to register' });
    }
  });

  router.add('POST', '/auth/login', async (req, res) => {
    try {
      const body = await (await import('../utils')).readJson<{ email?: string; password?: string }>(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password) return send(res, 400, { error: 'Email and password are required' });
      const repo = userRepo();
      const u = await repo.findByEmail(email);
      if (!u || !repo.verifyPassword(password, u.password_salt, u.password_hash)) return send(res, 401, { error: 'Invalid credentials' });
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: u.id,
        email: u.email,
        role: 'authenticated',
        app_metadata: { roles: [u.role] },
        iat: now,
        exp: now + 60 * 60 * 24, // 24h
      } as any;
      const token = signHS256(payload, ensureSecret());
      return send(res, 200, { access_token: token });
    } catch {
      return send(res, 500, { error: 'Unable to login' });
    }
  });

  router.add('GET', '/auth/verify', async (req, res) => {
    try {
      const auth = String(req.headers['authorization'] || '');
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (!m) return send(res, 400, { valid: false });
      const { verifyHS256 } = await import('../auth');
      const payload = verifyHS256(m[1], ensureSecret());
      return send(res, 200, { valid: !!payload, payload: payload ? { sub: payload.sub, app_metadata: payload.app_metadata, exp: payload.exp } : null });
    } catch {
      return send(res, 200, { valid: false });
    }
  });
}

