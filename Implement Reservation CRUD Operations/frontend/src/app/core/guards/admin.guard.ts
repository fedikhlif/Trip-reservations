import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) return inject(Router).createUrlTree(['/auth/login'], { queryParams: { role: 'ADMIN', returnUrl: '/admin' } });
  return auth.isAdmin() || inject(Router).createUrlTree(['/dashboard']);
};
