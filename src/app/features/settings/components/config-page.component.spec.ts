import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';

// Mock Angular's core dependencies and other services
vi.mock('@angular/core', () => ({
  Component: vi.fn(() => () => {}),
  inject: vi.fn(),
  signal: vi.fn((initial) => {
    let value = initial;
    const s = () => value;
    s.set = (v: any) => { value = v; };
    s.update = (fn: (v: any) => any) => { value = fn(value); };
    return s;
  }),
  computed: vi.fn((fn) => fn),
  effect: vi.fn(),
}));

import { ConfigPageComponent } from './config-page.component';
import { AuthService } from '@app/infrastructure/auth.service';
import { BudgetStore } from '@application/budget.store';
import { ApiService } from '@app/infrastructure/api.service';

describe('ConfigPageComponent', () => {
  let component: ConfigPageComponent;
  let mockAuthService: any;
  let mockStore: any;
  let mockApiService: any;
  let mockUiService: any;
  let mockNotifyService: any;
  let mockErrorService: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockAuthService = {
      user: signal({ email: 'me@example.com' }),
    };
    mockStore = {
      participants: signal([{ id: 'p1', name: 'Me', income: 1000, email: 'me@example.com' }]),
      refreshFromApi: vi.fn().mockResolvedValue(undefined),
      groupId: signal('group1'),
    };
    mockApiService = {
      getUsersMe: vi.fn().mockResolvedValue({ default_income: 1000 }),
      updateUser: vi.fn().mockResolvedValue(undefined),
      updateSelfParticipant: vi.fn().mockResolvedValue(undefined),
    };
    mockUiService = { showLoading: vi.fn(), hideLoading: vi.fn() };
    mockNotifyService = { success: vi.fn(), info: vi.fn() };
    mockErrorService = { handle: vi.fn() };

    // Setup DI for inject()
    const { inject } = require('@angular/core');
    (inject as vi.Mock).mockImplementation((token: any) => {
      if (token === BudgetStore) return mockStore;
      if (token === AuthService) return mockAuthService;
      if (token === ApiService) return mockApiService;
      if (token === mockUiService) return mockUiService;
      if (token === mockNotifyService) return mockNotifyService;
      if (token === mockErrorService) return mockErrorService;
      return {};
    });

    component = new ConfigPageComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not be dirty on initialization', async () => {
    await new Promise(process.nextTick);
    expect(component.isDirty()).toBe(false);
  });

  it('should detect name change and mark as dirty', async () => {
    await new Promise(process.nextTick);
    const currentState = component.formState();
    component.formState.set({ ...currentState, name: 'New Name' });
    expect(component.isDirty()).toBe(true);
  });

  it('should call save API when saveProfile is called and form is dirty', async () => {
    await new Promise(process.nextTick);
    component.formState.set({ ...component.formState(), name: 'New Name' });
    await component.saveProfile();
    expect(mockApiService.updateSelfParticipant).toHaveBeenCalled();
  });
});