import { inject } from '@angular/core';
import {
  type CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Allows access only to authenticated users (customer OR admin).
 * Unauthenticated users are redirected to /login with a returnUrl param.
 */
export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Allows access only to administrators (role === 'admin').
 * Unauthenticated users go to /login; authenticated non-admins go to home.
 */
export const adminGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  if (auth.isAdmin()) {
    return true;
  }
  // Logged-in but not an admin → redirect home silently
  return router.createUrlTree(['/']);
};

/**
 * Allows access only to guests (not authenticated).
 * Already-authenticated users are redirected to /mes-reservations.
 */
export const noAuthGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/mes-reservations']);
};
