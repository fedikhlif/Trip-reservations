import { Routes } from '@angular/router';
import { adminGuard, authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
    canActivate: [noAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register-page/register-page.component').then(
        (m) => m.RegisterPageComponent,
      ),
    canActivate: [noAuthGuard],
  },

  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
      },
      {
        path: 'destinations',
        loadComponent: () =>
          import('./features/voyages/pages/destinations-page/destinations-page.component').then(
            (m) => m.DestinationsPageComponent,
          ),
      },
      {
        path: 'circuits',
        loadComponent: () =>
          import('./features/voyages/pages/tours-page/tours-page.component').then(
            (m) => m.ToursPageComponent,
          ),
      },
      {
        path: 'reservation',
        loadComponent: () =>
          import('./features/reservations/pages/booking-page/booking-page.component').then(
            (m) => m.BookingPageComponent,
          ),
      },
      {
        path: 'mes-reservations',
        loadComponent: () =>
          import('./features/reservations/pages/my-reservations-page/my-reservations-page.component').then(
            (m) => m.MyReservationsPageComponent,
          ),
        canActivate: [authGuard],
      },
      // ── Admin ──────────────────────────────────────────────────
      {
        path: 'admin/trips',
        loadComponent: () =>
          import('./features/admin/pages/trip-management-page/trip-management-page.component').then(
            (m) => m.TripManagementPageComponent,
          ),
        canActivate: [adminGuard],
      },
      {
        path: 'admin/catalogue',
        loadComponent: () =>
          import('./features/admin/pages/trip-catalogue-page/trip-catalogue-page.component').then(
            (m) => m.TripCataloguePageComponent,
          ),
        canActivate: [adminGuard],
      },
      {
        path: 'admin/destinations',
        loadComponent: () =>
          import('./features/admin/pages/destination-management-page/destination-management-page.component').then(
            (m) => m.DestinationManagementPageComponent,
          ),
        canActivate: [adminGuard],
      },
      // ── Other ──────────────────────────────────────────────────
      {
        path: 'a-propos',
        loadComponent: () =>
          import('./features/home/pages/about-page/about-page.component').then(
            (m) => m.AboutPageComponent,
          ),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/home/pages/contact-page/contact-page.component').then(
            (m) => m.ContactPageComponent,
          ),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
