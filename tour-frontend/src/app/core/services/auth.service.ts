import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type CustomerProfile,
  type LoginRequest,
  type RegisterRequest,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiBaseUrl}/auth`;

  /** Reactive authentication state. null = not yet checked. */
  private readonly _currentUser = signal<CustomerProfile | null | undefined>(undefined);

  /** Exposed read-only signal. */
  readonly currentUser = this._currentUser.asReadonly();

  /** True once the initial /me check has completed. */
  private readonly _initialized = signal(false);
  readonly initialized = this._initialized.asReadonly();

  /** Convenience derived signals. */
  readonly isLoggedIn = computed(() => this._currentUser() != null && this._currentUser() !== undefined);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');
  readonly firstName = computed(() => this._currentUser()?.first_name ?? '');

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  /**
   * Called once at app startup (APP_INITIALIZER) to restore session state.
   * Returns an observable that completes after the check resolves.
   */
  checkSession(): Observable<CustomerProfile | null> {
    return this.http.get<CustomerProfile>(`${this.base}/me`, { withCredentials: true }).pipe(
      tap((user) => {
        this._currentUser.set(user);
        this._initialized.set(true);
      }),
      catchError(() => {
        this._currentUser.set(null);
        this._initialized.set(true);
        return of(null);
      }),
    );
  }

  login(credentials: LoginRequest): Observable<CustomerProfile> {
    return this.http
      .post<CustomerProfile>(`${this.base}/login`, credentials, { withCredentials: true })
      .pipe(
        tap((user) => this._currentUser.set(user)),
        catchError(this._handleError),
      );
  }

  register(data: RegisterRequest): Observable<CustomerProfile> {
    return this.http
      .post<CustomerProfile>(`${this.base}/register`, data, { withCredentials: true })
      .pipe(
        tap((user) => this._currentUser.set(user)),
        catchError(this._handleError),
      );
  }

  logout(): void {
    this.http
      .post<void>(`${this.base}/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => {
          this._currentUser.set(null);
          this.router.navigate(['/']);
        },
        error: () => {
          // Clear client state even if the server call fails.
          this._currentUser.set(null);
          this.router.navigate(['/']);
        },
      });
  }

  private _handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'An unexpected error occurred.';
    if (error.status === 0) {
      message = 'The server is unreachable. Make sure it is running.';
    } else if (error.error?.error) {
      message = error.error.error;
    } else if (error.status >= 500) {
      message = 'The service is temporarily unavailable. Please try again.';
    }
    return throwError(() => new Error(message));
  }
}
