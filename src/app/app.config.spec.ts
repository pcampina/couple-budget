import { describe, it, expect, vi } from 'vitest';

// Mock all Angular dependencies before importing anything
vi.mock('@angular/core', async (importActual) => {
  const actual = await importActual<any>();
  return {
    ...actual,
    LOCALE_ID: 'LOCALE_ID',
    provideBrowserGlobalErrorListeners: () => 'error-listeners',
  };
});

vi.mock('@angular/platform-browser/animations', () => ({
  provideAnimations: () => 'animations',
}));

vi.mock('@angular/common/http', () => ({
  provideHttpClient: () => 'http',
  withInterceptors: () => (x: any) => x,
}));

vi.mock('@angular/router', () => ({
  provideRouter: () => 'router',
}));

// Mock local components used in route definitions to avoid Angular JIT
vi.mock('@app/features/login/components/login.component', () => ({ LoginComponent: class {} }));
vi.mock('@app/app.component', () => ({ AppComponent: class {} }));
vi.mock('@app/shared/components/layout.component', () => ({ LayoutComponent: class {} }));
vi.mock('@app/features/settings/components/config-page.component', () => ({ ConfigPageComponent: class {} }));
vi.mock('@app/features/transactions/components/expenses-page.component', () => ({ ExpensesPageComponent: class {} }));
vi.mock('@app/features/transactions/components/groups-list.component', () => ({ GroupsListComponent: class {} }));

vi.mock('@app/features/groups/components/group-page.component', () => ({ GroupPageComponent: class {} }));
vi.mock('@app/features/activity/components/activity-page.component', () => ({ ActivityPageComponent: class {} }));
vi.mock('@app/features/invite-accept/components/invite-accept.component', () => ({ InviteAcceptComponent: class {} }));

// Mock the auth modules to prevent Router compilation issues
vi.mock('@app/infrastructure/auth.interceptor', () => ({
  authInterceptor: 'auth-interceptor'
}));
vi.mock('@app/infrastructure/auth.guard', () => ({
  authGuard: 'auth-guard'
}));

import { appConfig } from '@app/app.config';

describe('appConfig', () => {
  it('exposes providers including error listeners, animations and locale', () => {
    expect(appConfig).toBeTruthy();
    const providers = (appConfig as any).providers as any[];
    expect(providers).toContain('error-listeners');
    expect(providers).toContain('animations');
    // Find LOCALE provider
    const localeProv = providers.find(p => p && p.provide === 'LOCALE_ID');
    expect(localeProv).toBeTruthy();
    expect(localeProv.useValue).toBe('pt-PT');
  });
});
