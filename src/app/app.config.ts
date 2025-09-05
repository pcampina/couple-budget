import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './infrastructure/auth.interceptor';
import { provideRouter, Routes } from '@angular/router';
import { authGuard } from './infrastructure/auth.guard';
import { AppComponent } from './app.component';
import { LoginComponent } from './login.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const routes: Routes = [
  { path: '', component: AppComponent, canActivate: [authGuard] },
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
