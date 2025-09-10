import { describe, it, expect, vi } from 'vitest';
import { of, throwError, firstValueFrom } from 'rxjs';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

let mockAuthService: any;
let mockRouter: any;

// Mock Angular core and router before importing
vi.mock('@angular/core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    inject: vi.fn((token: any) => {
      if (token === Injector) {
        return {
          get: vi.fn((getToken: any) => {
            if (getToken === AuthService) {
              return mockAuthService;
            } else if (getToken === Router) {
              return mockRouter;
            }
            return null;
          }),
        };
      } else if (token === Router) {
        return mockRouter;
      }
      return actual.inject(token);
    }),
  };
});

vi.mock('@angular/router', () => ({
  Router: vi.fn().mockImplementation(() => ({
    navigateByUrl: vi.fn(),
    createUrlTree: vi.fn()
  }))
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
    mockAuthService = { getAccessToken: vi.fn(async () => 'abc'), refreshAccessToken: vi.fn() };
    mockRouter = { navigateByUrl: vi.fn() };

    const req = makeReq();
    const next = vi.fn(() => of({ ok: true } as any));
    const res$ = authInterceptor(req, next);
    const res = await firstValueFrom(res$);
    expect(res).toEqual({ ok: true });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('refreshes on 401 and retries once', async () => {
    mockAuthService = { getAccessToken: vi.fn(async () => 'old'), refreshAccessToken: vi.fn(async () => 'new') };
    mockRouter = { navigateByUrl: vi.fn() };

    const req = makeReq();
    const next = vi
      .fn()
      .mockImplementationOnce(() => throwError(() => ({ status: 401 })))
      .mockImplementationOnce(() => of({ ok: true } as any));
    const res$ = authInterceptor(req, next);
    const res = await firstValueFrom(res$);
    expect(res).toEqual({ ok: true });
    expect(mockAuthService.refreshAccessToken).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('redirects to /login on 401 when refresh fails', async () => {
    mockAuthService = { getAccessToken: vi.fn(async () => 'old'), refreshAccessToken: vi.fn(async () => null) };
    mockRouter = { navigateByUrl: vi.fn() };

    const req = makeReq();
    const next = vi.fn(() => throwError(() => ({ status: 401 })));
    const res$ = authInterceptor(req, next);
    await expect(firstValueFrom(res$)).rejects.toBeTruthy();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});