import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import { User, UserRole } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  login(email: string, role: UserRole): Observable<User> {
    const user: User = { id: 1, email, displayName: role === 'ADMIN' ? 'Alex Morgan' : 'Maya Bennett', role, accessToken: 'mock-access-token' };
    return of(user).pipe(delay(450), tap((value) => this.currentUser.set(value)));
  }

  logout(): void {
    this.currentUser.set(null);
  }

  token(): string | undefined {
    return this.currentUser()?.accessToken;
  }
}
