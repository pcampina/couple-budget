// Mock Angular core + animations to import config without ESM issues
jest.mock('@angular/core', () => ({
  LOCALE_ID: 'LOCALE_ID',
  provideBrowserGlobalErrorListeners: () => 'error-listeners',
}))
jest.mock('@angular/platform-browser/animations', () => ({
  provideAnimations: () => 'animations',
}))

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

