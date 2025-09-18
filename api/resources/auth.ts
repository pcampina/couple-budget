import { send } from '../utils.js';
import type { Router } from '../router.js';
import { userRepo } from '../repositories/userRepo.js';
import { Role } from '../types/domain.js';
import { signHS256 } from '../auth.js';

function ensureSecret(): string {
  return process.env.AUTH_JWT_SECRET || 'dev-secret';
}

export function registerAuth(router: Router): void {
  router.add('POST', '/auth/register', async (req, res) => {
    try {
      const { readJson } = await import('../utils.js');
      const body = await readJson(req) as { email?: string; name?: string; password?: string };
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim() || email.split('@')[0] || 'User';
      const password = String(body.password || '');
      if (!email || !password) return send(res, 400, { error: 'Email and password are required' });
      const repo = userRepo();
      const u = await repo.createUser(email, name, password, Role.User);
      return send(res, 201, { id: u.id, email: u.email, name: u.name, role: u.role });
    } catch (e: unknown) {
      const code = (e as { code?: unknown })?.code;
      const msg = String((e as Error)?.message || '');
      if (code === '23505' || /unique/i.test(msg)) return send(res, 409, { error: 'Email already exists' });
      return send(res, 500, { error: 'Unable to register' });
    }
  });

  router.add('POST', '/auth/login', async (req, res) => {
    try {
      const { readJson } = await import('../utils.js');
      const body = await readJson(req) as { email?: string; password?: string };
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
        app_metadata: { roles: [u.role] as string[] },
        iat: now,
        exp: now + 60 * 60 * 24, // 24h
      };
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
      const { verifyHS256 } = await import('../auth.js');
      const payload = verifyHS256(m[1], ensureSecret());
      return send(res, 200, { valid: !!payload, payload: payload ? { sub: payload.sub, app_metadata: payload.app_metadata, exp: payload.exp } : null });
    } catch {
      return send(res, 200, { valid: false });
    }
  });
}
