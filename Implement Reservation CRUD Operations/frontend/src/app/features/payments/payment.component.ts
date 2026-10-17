import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentService } from '../../core/services/payment.service';
import { ReservationService } from '../../core/services/reservation.service';
import { TripService } from '../../core/services/trip.service';
import { Payment } from '../../shared/models';

@Component({
  imports: [RouterLink],
  template: `
    <section class="page container payment">
      @if (loading()) { <div class="loading-state">Chargement du paiement…</div> }
      @if (reservation(); as item) { @let trip = trips.getById(item.tripId);
        <div class="seal">✓</div><p class="eyebrow">Réservation reçue</p><h1>{{ item.paymentStatus === 'Payé' ? 'Tout est prêt.' : 'Votre place est réservée.' }}</h1><p>Réservation <strong>{{ item.id }}</strong> pour {{ trip?.title }}</p>
        <div class="payment-card"><header><span><small>Montant total</small><h2>{{ item.total }} €</h2></span><b class="badge">{{ payment()?.status ?? item.paymentStatus }}</b></header><div class="steps"><span class="done">1<strong>Réservation créée</strong></span><span>2<strong>Paiement vérifié</strong></span><span>3<strong>Voyage confirmé</strong></span></div><div class="summary"><span>Voyageurs<strong>{{ item.guests }}</strong></span><span>Départ<strong>{{ trip?.date }}</strong></span><span>Réservé le<strong>{{ item.bookedOn }}</strong></span></div></div>
        <div class="center"><a routerLink="/reservations" class="button primary">Gérer la réservation</a><a routerLink="/trips" class="button outline">Explorer</a></div>
      } @else if (!loading()) { <h1>Réservation introuvable</h1> }
    </section>
  `,
})
export class PaymentComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reservations = inject(ReservationService);
  private readonly payments = inject(PaymentService);
  readonly trips = inject(TripService);
  readonly payment = signal<Payment | undefined>(undefined);
  readonly loading = signal(true);
  readonly reservationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly reservation = computed(() => this.reservations.getById(this.reservationId));

  constructor() {
    this.payments.getByReservation(this.reservationId).subscribe({
      next: (value) => { this.payment.set(value); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
