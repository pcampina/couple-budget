import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!auth.isConfigured()) return true;
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};
