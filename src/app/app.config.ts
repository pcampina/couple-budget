import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@app/infrastructure/auth.interceptor';
import { provideRouter, Routes } from '@angular/router';
import { authGuard } from '@app/infrastructure/auth.guard';
import { LayoutComponent } from '@app/shared/components/layout.component';
import { ConfigPageComponent } from '@app/features/settings/components/config-page.component';
import { ExpensesPageComponent } from '@app/features/transactions/components/expenses-page.component';
import { GroupsListComponent } from '@app/features/transactions/components/groups-list.component';
import { ActivityPageComponent } from '@app/features/activity/components/activity-page.component';
import { GroupPageComponent } from '@app/features/groups/components/group-page.component';
import { LoginComponent } from '@app/features/login/components/login.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { InviteAcceptComponent } from '@app/features/invite-accept/components/invite-accept.component';

const routes: Routes = [
  {
    path: '', component: LayoutComponent, canActivate: [authGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'config' },
      { path: 'config', component: ConfigPageComponent },
      { path: 'transactions', component: ExpensesPageComponent },
      { path: 'transactions/:groupSlug', component: ExpensesPageComponent },
      { path: 'expenses', redirectTo: 'transactions' },
      { path: 'groups', redirectTo: '/transactions', pathMatch: 'full' },
      { path: 'group/:groupSlug', component: GroupPageComponent },
      { path: 'activity', component: ActivityPageComponent },
    ]
  },
  { path: 'login', component: LoginComponent },
  { path: 'invite/:token', component: InviteAcceptComponent },
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
