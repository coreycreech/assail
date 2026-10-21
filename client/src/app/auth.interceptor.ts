import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('assail-token');
  const isApi = request.url.startsWith('/api/');
  const outgoing = token && isApi ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : request;
  return next(outgoing).pipe(catchError(error => {
    const databaseLost = error.status === 503 &&
      (error.error?.code === 'DATABASE_UNAVAILABLE' || error.headers?.get('X-Session-Reset') === 'database-unavailable');
    if (isApi && token && databaseLost && sessionStorage.getItem('assail-token') === token) {
      auth.logout();
      void router.navigate(['/login'], { queryParams: { reason: 'database-unavailable' } });
    }
    return throwError(() => error);
  }));
};
