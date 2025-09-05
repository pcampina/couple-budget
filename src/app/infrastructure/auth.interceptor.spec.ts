import { describe, it, expect, vi } from 'vitest';
import { of, throwError, firstValueFrom } from 'rxjs';

let injectQueue: any[] = [];

// Mock Angular core and router before importing
vi.mock('@angular/core', () => ({ inject: () => injectQueue.shift() }));

vi.mock('@angular/router', () => ({
  Router: vi.fn().mockImplementation(() => ({
    navigateByUrl: vi.fn(),
    createUrlTree: vi.fn()
  }))
}));

vi.mock('@angular/common/http', () => ({
  HttpInterceptorFn: 'HttpInterceptorFn'
}));

vi.mock('./auth.service', () => ({
  AuthService: vi.fn()
}));

import { authInterceptor } from './auth.interceptor';

function makeReq() {
  const headers: Record<string, string> = {};
  return {
    headers: {
      set: (k: string, v: string) => ({ ...headers, [k]: v }),
    },
    clone: ({ headers: h }: any) => ({ headers: h }),
  } as any;
}

describe('authInterceptor', () => {
  it('adds Authorization when token present', async () => {
    const auth = { getAccessToken: vi.fn(async () => 'abc'), refreshAccessToken: vi.fn() };
    const router = { navigateByUrl: vi.fn() };
    injectQueue = [auth, router];
    const req = makeReq();
    const next = vi.fn(() => of({ ok: true } as any));
    const res$ = authInterceptor(req, next);
    const res = await firstValueFrom(res$);
    expect(res).toEqual({ ok: true });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('refreshes on 401 and retries once', async () => {
    const auth = { getAccessToken: vi.fn(async () => 'old'), refreshAccessToken: vi.fn(async () => 'new') };
    const router = { navigateByUrl: vi.fn() };
    injectQueue = [auth, router];
    const req = makeReq();
    const next = vi
      .fn()
      .mockImplementationOnce(() => throwError(() => ({ status: 401 })))
      .mockImplementationOnce(() => of({ ok: true } as any));
    const res$ = authInterceptor(req, next);
    const res = await firstValueFrom(res$);
    expect(res).toEqual({ ok: true });
    expect(auth.refreshAccessToken).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('redirects to /login on 401 when refresh fails', async () => {
    const auth = { getAccessToken: vi.fn(async () => 'old'), refreshAccessToken: vi.fn(async () => null) };
    const router = { navigateByUrl: vi.fn() };
    injectQueue = [auth, router];
    const req = makeReq();
    const next = vi.fn(() => throwError(() => ({ status: 401 })));
    const res$ = authInterceptor(req, next);
    await expect(firstValueFrom(res$)).rejects.toBeTruthy();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
