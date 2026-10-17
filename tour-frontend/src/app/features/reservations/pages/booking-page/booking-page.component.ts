import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { PageHeaderComponent } from '../../../../shared/components/site-parts/site-parts.component';
import { TripCardComponent } from '../../../../shared/components/cards/cards.component';
import { DestinationService } from '../../../../core/services/destination.service';
import { ReservationService } from '../../../../core/services/reservation.service';
import { TripService } from '../../../../core/services/trip.service';
import { type Destination } from '../../../../core/models/destination.model';
import { type Reservation } from '../../../../core/models/reservation.model';
import { type Trip } from '../../../../core/models/trip.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, PageHeaderComponent, TripCardComponent],
  template: `
    <app-page-header title="Réservation" current="Réservation" />
    <main class="booking-page">
      <section class="booking-search-layout">
        <div>
          <p>Votre prochain départ</p>
          <h2>Planifiez votre aventure</h2>
          <span>Les dates, tarifs et disponibilités proviennent du catalogue des voyages.</span>
        </div>
        <form class="booking-form-page" (ngSubmit)="search()">
          <p *ngIf="destinationsLoading" role="status">Chargement des destinations…</p>
          <p *ngIf="destinationsError" class="api-error" role="alert">{{ destinationsError }}</p>
          <label>
            Destination
            <select [(ngModel)]="destinationId" name="destination" required>
              <option [ngValue]="null">Choisissez votre destination</option>
              <option *ngFor="let destination of destinations" [ngValue]="destination.id">
                {{ destination.name }}, {{ destination.country }}
              </option>
            </select>
          </label>
          <div class="form-columns">
            <label>Date de départ<input type="date" [(ngModel)]="departureDate" name="departureDate" [min]="today" required /></label>
            <label>Date de retour<input type="date" [(ngModel)]="returnDate" name="returnDate" [min]="departureDate || today" required /></label>
          </div>
          <label>
            Voyageurs
            <select [(ngModel)]="travelers" name="travelers">
              <option *ngFor="let count of travelerOptions" [ngValue]="count">{{ count }} voyageur{{ count > 1 ? 's' : '' }}</option>
            </select>
          </label>
          <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
          <button type="submit" [disabled]="loading || destinationsLoading">
            <i *ngIf="loading" class="spinner"></i>
            Rechercher un voyage
          </button>
        </form>
      </section>

      <section *ngIf="searched && !selectedTrip" id="available-tours" class="available-tours">
        <h2>Voyages disponibles</h2>
        <p *ngIf="loading" role="status">Recherche des disponibilités…</p>
        <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
        <ng-container *ngIf="!loading && !error">
          <div *ngIf="matchingTrips.length; else noResult" class="cards-grid">
            <app-trip-card *ngFor="let trip of matchingTrips" [trip]="trip" (book)="selectTrip($event)" />
          </div>
          <ng-template #noResult>
            <div class="empty-state">
              <h3>Aucun voyage trouvé</h3>
              <p>Essayez d'autres dates ou réduisez le nombre de voyageurs.</p>
            </div>
          </ng-template>
        </ng-container>
      </section>

      <section *ngIf="selectedTrip && !bookingResult" id="booking-flow" class="booking-flow-page">
        <div class="progress-steps">
          <div class="active"><b>1</b><span>Récapitulatif</span></div>
          <div><b>2</b><span>Confirmation</span></div>
        </div>
        <div class="flow-panel">
          <p>Vérifiez votre demande</p>
          <h2>{{ selectedTrip.title }}</h2>
          <div class="review-summary">
            <div>
              <h3>{{ selectedTrip.destination }}, {{ selectedTrip.country }}</h3>
              <span>{{ formatDate(selectedTrip.start_date) }} → {{ formatDate(selectedTrip.end_date) }}</span>
              <span>{{ travelers }} voyageur{{ travelers > 1 ? 's' : '' }}</span>
            </div>
            <div class="price-lines">
              <p><span>Prix par personne</span><strong>{{ formatPrice(selectedTrip.price) }}</strong></p>
              <p><span>Total pour {{ travelers }} voyageur{{ travelers > 1 ? 's' : '' }}</span><strong>{{ totalPrice }}</strong></p>
            </div>
          </div>
          <p class="demo-notice">
            Cette démonstration enregistre la réservation sous le compte de test « Jordan Lee ».
            Aucun compte client ni moyen de paiement réel n'est configuré.
          </p>
          <label class="terms-line">
            <input type="checkbox" [(ngModel)]="termsAccepted" />
            Je confirme les dates et le nombre de voyageurs.
          </label>
          <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
          <div class="flow-actions">
            <button type="button" (click)="selectedTrip = null; bookingResult = null">Retour aux résultats</button>
            <button type="button" [disabled]="!termsAccepted || loading" (click)="confirm()">
              <i *ngIf="loading" class="spinner"></i>
              Enregistrer la réservation
            </button>
          </div>
        </div>
      </section>

      <section *ngIf="bookingResult" class="booking-flow-page confirmation-panel">
        <i>✓</i>
        <h2>Demande de réservation enregistrée</h2>
        <p>La réservation est en attente. Aucun paiement réel n'a été effectué.</p>
        <div>
          <small>Référence de réservation</small>
          <strong>#{{ bookingResult.id }}</strong>
        </div>
        <h3>{{ bookingResult.trip_title }}</h3>
        <span>{{ statusLabel(bookingResult.status) }} · {{ formatPrice(bookingResult.total_price) }}</span>
        <button type="button" (click)="router.navigate(['/mes-reservations'])">Voir mes réservations</button>
      </section>
    </main>
  `,
})
export class BookingPageComponent implements OnInit {
  readonly travelerOptions = [1, 2, 3, 4, 5, 6];
  readonly today = this.localDate(new Date());
  destinations: Destination[] = [];
  matchingTrips: Trip[] = [];
  destinationId: number | null = null;
  departureDate = '';
  returnDate = '';
  travelers = 1;
  selectedTrip: Trip | null = null;
  bookingResult: Reservation | null = null;
  searched = false;
  loading = false;
  destinationsLoading = true;
  destinationsError = '';
  error = '';
  termsAccepted = false;

  get totalPrice(): string {
    if (!this.selectedTrip) {
      return '';
    }
    const totalCents = Math.round(Number(this.selectedTrip.price) * 100)
      * this.travelers;
    return this.formatPrice((totalCents / 100).toFixed(2));
  }

  constructor(
    private readonly destinationService: DestinationService,
    private readonly tripService: TripService,
    private readonly reservationService: ReservationService,
    readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.destinationService.getAll().subscribe({
      next: (destinations) => {
        this.destinations = destinations;
        this.destinationsLoading = false;
      },
      error: (error: unknown) => {
        this.destinationsError = apiErrorMessage(error);
        this.destinationsLoading = false;
      },
    });

    this.route.queryParams.subscribe((params) => {
      this.destinationId = params['destinationId']
        ? Number(params['destinationId'])
        : null;
      this.departureDate = params['departureDate'] || '';
      this.returnDate = params['returnDate'] || '';
      this.travelers = Math.max(1, Number(params['travelers']) || 1);
      const tripId = Number(params['tripId']);
      if (tripId > 0) {
        this.loading = true;
        this.tripService.getById(tripId).subscribe({
          next: (trip) => {
            this.selectedTrip = trip;
            this.destinationId = trip.destination_id;
            this.departureDate = trip.start_date;
            this.returnDate = trip.end_date;
            this.searched = true;
            this.loading = false;
          },
          error: (error: unknown) => {
            this.error = apiErrorMessage(error);
            this.loading = false;
          },
        });
      } else if (this.destinationId && this.departureDate && this.returnDate) {
        this.search();
      }
    });
  }

  search(): void {
    this.error = '';
    if (!this.destinationId || !this.departureDate || !this.returnDate) {
      this.error = 'Choisissez une destination ainsi que vos dates de départ et de retour.';
      return;
    }
    if (this.departureDate < this.today) {
      this.error = 'La date de départ doit être aujourd’hui ou ultérieure.';
      return;
    }
    if (this.returnDate < this.departureDate) {
      this.error = 'La date de retour ne peut pas précéder la date de départ.';
      return;
    }
    this.loading = true;
    this.searched = true;
    this.selectedTrip = null;
    this.bookingResult = null;
    this.tripService.search({
      destination_id: this.destinationId,
      departure_date: this.departureDate,
      return_date: this.returnDate,
      travelers: this.travelers,
    }).subscribe({
      next: (trips) => {
        this.matchingTrips = trips;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  confirm(): void {
    if (!this.selectedTrip || !this.termsAccepted || this.loading) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.reservationService.create({
      trip_id: this.selectedTrip.id,
      travelers: this.travelers,
    }).subscribe({
      next: (reservation) => {
        this.bookingResult = reservation;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  formatPrice(amount: string): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  }

  statusLabel(status: string): string {
    return status === 'PENDING' ? 'En attente' : status === 'CONFIRMED' ? 'Confirmée' : 'Annulée';
  }

  private localDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
