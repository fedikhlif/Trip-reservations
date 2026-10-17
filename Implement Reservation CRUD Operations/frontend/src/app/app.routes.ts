import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { LoginComponent } from './features/auth/login.component';
import { CustomerDashboardComponent } from './features/customer-dashboard/customer-dashboard.component';
import { DestinationsComponent } from './features/destinations/destinations.component';
import { HomeComponent } from './features/home/home.component';
import { PaymentComponent } from './features/payments/payment.component';
import { ReservationsComponent } from './features/reservations/reservations.component';
import { TripDetailComponent } from './features/trips/trip-detail.component';
import { TripsComponent } from './features/trips/trips.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Roamly — Voyages autrement' },
  { path: 'trips', component: TripsComponent, title: 'Explorer les voyages' },
  { path: 'trips/:id', component: TripDetailComponent, title: 'Détails du voyage' },
  { path: 'destinations', component: DestinationsComponent, title: 'Destinations' },
  { path: 'auth/login', component: LoginComponent, title: 'Connexion' },
  { path: 'reservations', component: ReservationsComponent, canActivate: [authGuard], title: 'Mes réservations' },
  { path: 'payment/:id', component: PaymentComponent, canActivate: [authGuard], title: 'Statut du paiement' },
  { path: 'dashboard', component: CustomerDashboardComponent, canActivate: [authGuard], title: 'Espace voyageur' },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard], title: 'Administration' },
  { path: '**', redirectTo: '' },
];
