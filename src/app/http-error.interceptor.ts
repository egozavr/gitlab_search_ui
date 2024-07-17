import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(private snackbar: MatSnackBar) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError(err => {
        let message: string;
        if (err instanceof HttpErrorResponse) {
          message = `Http error, status ${err.status}, url ${err.url}: ${err.message}`;
        } else {
          message = `Unknown error: ${err?.message || err?.error || err}`;
        }
        this.snackbar.open(message, 'Close', { duration: 15000, panelClass: 'error-snackbar' });
        return throwError(() => err);
      }),
    );
  }
}
