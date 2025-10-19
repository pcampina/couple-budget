import { ComponentFixture, TestBed, resolveComponentResources } from '@angular/core/testing';
import { ConfigPageComponent } from './config-page.component';
import { AuthService } from '@app/infrastructure/auth.service';
import { BudgetStore } from '@application/budget.store';
import { ApiService } from '@app/infrastructure/api.service';
import { UiService } from '@app/infrastructure/ui.service';
import { NotificationService } from '@app/infrastructure/notification.service';
import { ErrorService } from '@app/infrastructure/error.service';
import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgpButton, NgpInput, NgpLabel } from 'ng-primitives';

describe('ConfigPageComponent', () => {
  let component: ConfigPageComponent;
  let fixture: ComponentFixture<ConfigPageComponent>;

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

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ConfigPageComponent, FormsModule, CommonModule, NgpButton, NgpInput, NgpLabel],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: BudgetStore, useValue: mockBudgetStore },
        { provide: ApiService, useValue: mockApiService },
        { provide: UiService, useValue: mockUiService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ErrorService, useValue: mockErrorService },
      ],
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ConfigPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});