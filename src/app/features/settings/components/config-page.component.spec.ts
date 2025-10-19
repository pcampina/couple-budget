import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/infrastructure/auth.service';
import { BudgetStore } from '@application/budget.store';
import { ApiService } from '@app/infrastructure/api.service';
import { UiService } from '@app/infrastructure/ui.service';
import { NotificationService } from '@app/infrastructure/notification.service';
import { ErrorService } from '@app/infrastructure/error.service';
import { signal } from '@angular/core';
import { ConfigPageComponent } from './config-page.component';

describe('ConfigPageComponent', () => {
  let component: ConfigPageComponent;

  const mockAuthService = {
    user: signal({ email: 'me@example.com' }),
  };

  const mockBudgetStore = {
    participants: signal([{ id: 'p1', name: 'Me', income: 1000, email: 'me@example.com' }]),
    refreshFromApi: vi.fn().mockResolvedValue(undefined),
    groupId: signal('group1'),
  };

  const mockApiService = {
    getUsersMe: vi.fn().mockResolvedValue({ default_income: 1000 }),
    updateUser: vi.fn().mockResolvedValue(undefined),
    updateSelfParticipant: vi.fn().mockResolvedValue(undefined),
  };

  const mockUiService = { showLoading: vi.fn(), hideLoading: vi.fn() };
  const mockNotificationService = { success: vi.fn(), info: vi.fn() };
  const mockErrorService = { handle: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: BudgetStore, useValue: mockBudgetStore },
        { provide: ApiService, useValue: mockApiService },
        { provide: UiService, useValue: mockUiService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ErrorService, useValue: mockErrorService },
      ],
    });

    component = TestBed.runInInjectionContext(() => new ConfigPageComponent());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
