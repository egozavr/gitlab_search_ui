import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(MatSnackBar);

  return next(req).pipe(
    catchError(err => {
      let message: string;
      if (err instanceof HttpErrorResponse) {
        message = `Http error, status ${err.status}, url ${err.url}: ${err.message}`;
      } else {
        message = `Unknown error: ${err?.message || err?.error || err}`;
      }
      snackbar.open(message, 'Close', { duration: 15000, panelClass: 'error-snackbar' });
      return throwError(() => err);
    }),
  );
};
