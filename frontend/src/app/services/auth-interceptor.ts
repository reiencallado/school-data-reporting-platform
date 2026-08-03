import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const router = inject(Router);

  const clonedRequest = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(clonedRequest).pipe(
    catchError((error: unknown) => {
      const isLoginRequest = req.url.includes('/auth/login');

      if (error instanceof HttpErrorResponse && error.status === 401 && !isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.setItem('sessionExpired', 'true');
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};