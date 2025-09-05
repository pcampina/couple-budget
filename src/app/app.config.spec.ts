// Mock Angular core + animations to import config without ESM issues
vi.mock('@angular/core', () => ({
  LOCALE_ID: 'LOCALE_ID',
  provideBrowserGlobalErrorListeners: () => 'error-listeners',
  Injectable: () => (t: any) => t,
  inject: () => undefined,
}))
vi.mock('@angular/platform-browser/animations', () => ({
  provideAnimations: () => 'animations',
}))
vi.mock('@angular/common/http', () => ({
  provideHttpClient: () => 'http',
  withInterceptors: () => (x: any) => x,
}))
vi.mock('@angular/router', () => ({
  provideRouter: () => 'router',
}))

import { appConfig } from '@app/app.config';
// Mock local components used in route definitions to avoid Angular JIT
vi.mock('./login.component', () => ({ LoginComponent: class {} }))
vi.mock('./app.component', () => ({ AppComponent: class {} }))

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
