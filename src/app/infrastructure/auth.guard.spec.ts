import { describe, it, expect, vi } from 'vitest';

let injected: any[] = [];

// Mock Angular dependencies before importing
vi.mock('@angular/core', () => ({ inject: () => injected.shift() }));

vi.mock('@angular/router', () => ({
  Router: vi.fn().mockImplementation(() => ({
    navigateByUrl: vi.fn(),
    createUrlTree: vi.fn()
  })),
  CanActivateFn: 'CanActivateFn'
}));

vi.mock('./auth.service', () => ({
  AuthService: vi.fn()
}));

import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('allows when auth not required', async () => {
    const router = { createUrlTree: vi.fn(() => '/login') };
    const auth = { isConfigured: () => false, isAuthenticated: () => false, getAccessToken: vi.fn(async () => null) };
    injected = [router, auth];
    const res = await authGuard();
    expect(res).toBe(true);
  });

  it('redirects to /login when not authenticated', async () => {
    const router = { createUrlTree: vi.fn(() => '/login') };
    const auth = { isConfigured: () => true, isAuthenticated: () => false, getAccessToken: vi.fn(async () => null) };
    injected = [router, auth];
    const res = await authGuard();
    expect(res).toBe('/login');
  });

  it('allows when authenticated after hydration', async () => {
    const router = { createUrlTree: vi.fn(() => '/login') };
    const auth = { isConfigured: () => true, isAuthenticated: () => true, getAccessToken: vi.fn(async () => 't') };
    injected = [router, auth];
    const res = await authGuard();
    expect(res).toBe(true);
  });
});
