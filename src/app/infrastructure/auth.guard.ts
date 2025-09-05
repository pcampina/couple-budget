import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const usingApi = typeof window !== 'undefined' && (window as any).__USE_API__ === true;
  const requireAuth = usingApi || auth.isConfigured();
  if (!requireAuth) return true;
  // Ensure session is hydrated from persisted storage
  await auth.getAccessToken();
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};
