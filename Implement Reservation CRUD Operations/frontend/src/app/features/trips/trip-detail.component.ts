import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReservationService } from '../../core/services/reservation.service';
import { TripService } from '../../core/services/trip.service';

@Component({
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink],
  template: `
    @if (trip(); as item) {
      <section class="detail-hero"><img [src]="item.image" [alt]="item.location" /><div></div><header class="container"><span class="badge light">{{ item.category }}</span><h1>{{ item.title }}</h1><p>⌖ {{ item.location }}, {{ item.country }}</p></header></section>
      <section class="container detail-grid"><div><p class="eyebrow">Le voyage</p><h2>Voir le monde<br />avec un regard neuf.</h2><p class="lead">{{ item.description }}</p><div class="facts"><span>Durée<strong>{{ item.duration }} jours</strong></span><span>Départ<strong>{{ item.date }}</strong></span><span>Groupe<strong>14 max.</strong></span></div><h3>Les temps forts</h3><ul>@for (highlight of item.highlights; track highlight) { <li>✓ {{ highlight }}</li> }</ul></div>
        <aside><small>À partir de</small><h2>{{ item.price | currency:'EUR':'symbol':'1.0-0' }} <i>/ personne</i></h2><p class="availability">● {{ item.seats }} places disponibles</p>
          <form [formGroup]="bookingForm" (ngSubmit)="reserve(item.id)">
            <label><span>Voyageur principal</span><input formControlName="customer" /></label>
            @if (bookingForm.controls.customer.touched && bookingForm.controls.customer.invalid) { <p class="error">Le nom du voyageur est obligatoire.</p> }
            <label><span>Nombre de voyageurs</span><input formControlName="guests" type="number" min="1" [max]="item.seats" /></label>
            @if (error()) { <p class="error">{{ error() }}</p> }
            <div class="total"><span>Total estimé</span><strong>{{ item.price * bookingForm.controls.guests.value | currency:'EUR':'symbol':'1.0-0' }}</strong></div>
            <button class="button primary full" [disabled]="submitting()">{{ submitting() ? 'Réservation…' : 'Réserver ce voyage →' }}</button>
          </form>
        </aside>
      </section>
    } @else { <section class="page container"><h1>Voyage introuvable</h1><a routerLink="/trips" class="button primary">Retour aux voyages</a></section> }
  `,
})
export class TripDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservations = inject(ReservationService);
  private readonly trips = inject(TripService);
  private readonly fb = inject(FormBuilder);
  readonly trip = computed(() => this.trips.getById(Number(this.route.snapshot.paramMap.get('id'))));
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly bookingForm = this.fb.nonNullable.group({
    customer: ['Maya Bennett', [Validators.required, Validators.minLength(2)]],
    guests: [2, [Validators.required, Validators.min(1)]],
  });

  reserve(tripId: number): void {
    if (this.bookingForm.invalid) { this.bookingForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    const { customer, guests } = this.bookingForm.getRawValue();
    try {
      this.reservations.create(tripId, customer, guests).subscribe({
        next: (reservation) => this.router.navigate(['/payment', reservation.id]),
        error: () => { this.error.set('La réservation a échoué. Réessayez.'); this.submitting.set(false); },
      });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Réservation impossible');
      this.submitting.set(false);
    }
  }
}
