import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { type Destination } from '../../../core/models/destination.model';
import { type Trip } from '../../../core/models/trip.model';

@Component({
  selector: 'app-destination-card',
  standalone: true,
  imports: [],
  template: `
    <article class="destination-card-new">
      <div class="card-photo">
        <img [src]="fallbackImage" [alt]="destination.name + ', ' + destination.country" loading="lazy" />
      </div>
      <div class="card-copy">
        <small>⌖ {{ destination.name }}, {{ destination.country }}</small>
        <h3>{{ destination.name }}</h3>
        <p>{{ destination.description }}</p>
        <button type="button" (click)="book.emit()">
          Découvrir les voyages
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
        </button>
      </div>
    </article>
  `,
})
export class DestinationCardComponent {
  @Input({ required: true }) destination!: Destination;
  @Output() book = new EventEmitter<void>();
  readonly fallbackImage = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=80';
}

@Component({
  selector: 'app-trip-card',
  standalone: true,
  imports: [NgIf],
  template: `
    <article class="tour-card-new">
      <div class="card-photo">
        <img [src]="image" [alt]="trip.title" loading="lazy" />
        <span [style.background]="trip.available_seats < travelers ? '#dc2626' : '#0891b2'">
          {{ trip.available_seats === 0 ? 'Complet' : (trip.available_seats + ' place' + (trip.available_seats > 1 ? 's' : '') + ' disponible' + (trip.available_seats > 1 ? 's' : '')) }}
        </span>
        <small *ngIf="durationDays > 0">{{ durationDays }} jours</small>
      </div>
      <div class="card-copy">
        <div class="tour-kicker">
          <span>{{ trip.destination }}, {{ trip.country }}</span>
          <b>{{ formatDate(trip.start_date) }}</b>
        </div>
        <h3>{{ trip.title }}</h3>
        <p>{{ formatDate(trip.start_date) }} – {{ formatDate(trip.end_date) }}</p>
        <div>
          <strong>{{ formatPrice(trip.price) }} / personne</strong>
          <span>{{ trip.available_seats }} place{{ trip.available_seats > 1 ? 's' : '' }} restante{{ trip.available_seats > 1 ? 's' : '' }}</span>
        </div>
        <button
          type="button"
          [disabled]="trip.available_seats < travelers"
          (click)="book.emit(trip)"
          [attr.aria-label]="'Choisir le voyage ' + trip.title"
        >
          {{ trip.available_seats < travelers ? 'Places insuffisantes' : 'Choisir ce voyage' }}
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
        </button>
      </div>
    </article>
  `,
})
export class TripCardComponent {
  @Input({ required: true }) trip!: Trip;
  @Input() travelers = 1;
  @Output() book = new EventEmitter<Trip>();

  readonly fallbackImage = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80';

  get image(): string {
    const tripWithImage = this.trip as unknown as { image_url?: string; image?: string };
    if (tripWithImage.image_url) {
      return tripWithImage.image_url;
    }
    if (tripWithImage.image) {
      return tripWithImage.image;
    }
    return this.fallbackImage;
  }

  get durationDays(): number {
    if (!this.trip?.start_date || !this.trip?.end_date) return 0;
    const start = new Date(this.trip.start_date).getTime();
    const end = new Date(this.trip.end_date).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }

  formatPrice(amount: string): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount)) + ' €';
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  }
}
