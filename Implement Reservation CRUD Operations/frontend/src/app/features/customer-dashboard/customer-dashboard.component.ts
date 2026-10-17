import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReservationService } from '../../core/services/reservation.service';
import { TripService } from '../../core/services/trip.service';
import { TripCardComponent } from '../../shared/components/trip-card.component';

@Component({
  imports: [RouterLink, TripCardComponent],
  template: `
    <section class="page container"><div class="welcome"><div><p class="eyebrow">Espace voyageur</p><h1>Bon retour, {{ auth.currentUser()?.displayName }}.</h1><p>Votre prochaine aventure est plus proche que vous ne le pensez.</p></div><div class="profile"><b>MB</b><span><strong>{{ auth.currentUser()?.displayName }}</strong><small>Exploratrice depuis 2023</small></span></div></div>
      <div class="stats"><article><small>Voyages à venir</small><strong>{{ reservations.reservations().length }}</strong></article><article><small>Pays visités</small><strong>8</strong></article><article><small>Crédit voyage</small><strong>240 €</strong></article></div>
      @if (trips.trips()[0]; as nextTrip) { <article class="next-trip"><img [src]="nextTrip.image" alt="" /><div><span class="badge light">Prochain départ</span><h2>{{ nextTrip.title }}</h2><p>{{ nextTrip.date }} · {{ nextTrip.duration }} jours</p><a routerLink="/reservations" class="button outline light-button">Voir la réservation →</a></div></article> }
      <div class="section-head compact"><div><p class="eyebrow">Choisis pour vous</p><h2>Continuez d’explorer</h2></div></div><div class="trip-grid">@for (trip of trips.trips().slice(3, 6); track trip.id) { <app-trip-card [trip]="trip" /> }</div>
    </section>
  `,
})
export class CustomerDashboardComponent {
  readonly auth = inject(AuthService);
  readonly reservations = inject(ReservationService);
  readonly trips = inject(TripService);
}
