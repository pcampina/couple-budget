import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './infrastructure/auth.interceptor';
import { provideRouter, Routes } from '@angular/router';
import { authGuard } from './infrastructure/auth.guard';
import { LayoutComponent } from './components/layout/layout.component';
import { ConfigPageComponent } from './components/settings/config-page.component';
import { ExpensesPageComponent } from './components/transactions/expenses-page.component';
import { ActivityPageComponent } from './components/activity/activity-page.component';
import { GroupPageComponent } from './components/group/group-page.component';
import { LoginComponent } from './components/login/login.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const routes: Routes = [
  {
    path: '', component: LayoutComponent, canActivate: [authGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'config' },
      { path: 'config', component: ConfigPageComponent },
      { path: 'transactions', component: ExpensesPageComponent },
      { path: 'expenses', redirectTo: 'transactions' },
      { path: 'group', component: GroupPageComponent },
      { path: 'activity', component: ActivityPageComponent },
    ]
  },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'pt-PT' }
  ]
};
