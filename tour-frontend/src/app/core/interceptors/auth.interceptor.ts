import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

/**
 * Intercepts 401 Unauthorized responses from the API.
 * On 401, clears the navigation to /login so the user can re-authenticate.
 * Auth endpoints (/api/auth/*) are excluded to avoid redirect loops.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly router: Router) {}

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          !req.url.includes('/api/auth/')
        ) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url },
          });
          return EMPTY;
        }
        return throwError(() => error);
      }),
    );
  }
}
