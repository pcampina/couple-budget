import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return from(auth.getAccessToken()).pipe(
    switchMap(token => {
      const headers = token ? req.headers.set('Authorization', `Bearer ${token}`) : req.headers;
      const cloned = req.clone({ headers });
      return next(cloned);
    }),
    catchError(err => {
      if (err && err.status === 401) {
        // Try refresh once, then retry original request with new token
        return from(auth.refreshAccessToken()).pipe(
          switchMap(newToken => {
            if (!newToken) {
              try { router.navigateByUrl('/login'); } catch {}
              return throwError(() => err);
            }
            const retryHeaders = req.headers.set('Authorization', `Bearer ${newToken}`);
            const retried = req.clone({ headers: retryHeaders });
            return next(retried);
          }),
          catchError(() => {
            try { router.navigateByUrl('/login'); } catch {}
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
