import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReservationService } from '../../core/services/reservation.service';
import { TripService } from '../../core/services/trip.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page container narrow"><div class="section-head"><div><p class="eyebrow">Vos voyages</p><h1>Mes réservations</h1><p>Consultez les détails, le paiement et le statut de vos voyages.</p></div><a routerLink="/trips" class="button primary">Nouveau voyage</a></div>
      <div class="toolbar"><select [formControl]="filter"><option>Toutes</option><option>Confirmée</option><option>En attente</option><option>Annulée</option></select></div>
      @if (message()) { <div class="notice">{{ message() }} <button (click)="message.set('')">Fermer</button></div> }
      @if (service.loading()) { <div class="loading-state">Chargement des réservations…</div> }
      <div class="reservation-list">@for (item of filtered(); track item.id) { @let trip = trips.getById(item.tripId); <article class="reservation"><img [src]="trip?.image" alt="" /><div><header><span><small>{{ item.id }}</small><h2>{{ trip?.title }}</h2></span><b class="badge" [class.cancelled]="item.status === 'Annulée'">{{ item.status }}</b></header><p>{{ trip?.date }} · {{ item.guests }} voyageur(s) · {{ item.total }} €</p><div class="actions"><a [routerLink]="['/trips', item.tripId]" class="button outline">Voir le voyage</a><a [routerLink]="['/payment', item.id]" class="button ghost">Paiement : {{ item.paymentStatus }}</a>@if (item.status !== 'Annulée') { <button class="button danger" (click)="cancel(item.id)">Annuler</button> }</div></div></article> }</div>
    </section>
  `,
})
export class ReservationsComponent {
  readonly service = inject(ReservationService);
  readonly trips = inject(TripService);
  readonly filter = new FormControl('Toutes', { nonNullable: true });
  readonly filterValue = signal('Toutes');
  readonly message = signal('');
  readonly filtered = computed(() => this.service.reservations().filter((item) => this.filterValue() === 'Toutes' || item.status === this.filterValue()));

  constructor() {
    this.filter.valueChanges.subscribe((value) => this.filterValue.set(value));
  }

  cancel(id: string): void {
    this.service.updateStatus(id, 'Annulée').subscribe({
      next: () => this.message.set(`La réservation ${id} a été annulée.`),
      error: () => this.message.set('Impossible d’annuler cette réservation.'),
    });
  }
}
