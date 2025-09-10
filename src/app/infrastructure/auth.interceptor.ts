import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const router = inject(Router);

  // Lazily inject AuthService to break circular dependency
  const authService = () => injector.get(AuthService);
  const getAccessToken = () => authService().getAccessToken();
  const refreshAccessToken = () => authService().refreshAccessToken();

  return from(getAccessToken()).pipe(
    switchMap(token => {
      let headers = req.headers;
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
      const cloned = req.clone({ headers });
      return next(cloned);
    }),
    catchError(err => {
      if (err && err.status === 401) {
        // Try refresh once, then retry original request with new token
        return from(refreshAccessToken()).pipe(
          switchMap(newToken => {
            if (!newToken) {
              try { router.navigateByUrl('/login'); } catch {}
              return throwError(() => err);
            }
            let retryHeaders = req.headers;
            if (newToken) {
              retryHeaders = retryHeaders.set('Authorization', `Bearer ${newToken}`);
            }
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
