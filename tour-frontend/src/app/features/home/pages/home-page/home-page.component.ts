import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { DestinationService } from '../../../../core/services/destination.service';
import { TripService } from '../../../../core/services/trip.service';
import { type Destination } from '../../../../core/models/destination.model';
import { type Trip } from '../../../../core/models/trip.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import { DestinationCardComponent, TripCardComponent } from '../../../../shared/components/cards/cards.component';
import { SectionHeadingComponent, StatsBandComponent } from '../../../../shared/components/site-parts/site-parts.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    DestinationCardComponent,
    TripCardComponent,
    SectionHeadingComponent,
    StatsBandComponent,
  ],
  template: `
    <section class="home-hero">
      <div class="hero-overlay"></div>
      <div class="hero-layout">
        <div class="hero-message">
          <p><i></i>Explore the world with us</p>
          <h1>Discover your perfect trip</h1>
          <span>Unforgettable adventures, exceptional destinations, and memories that last a lifetime.</span>
          <div>
            <button type="button" (click)="goToDestinations()">
              Start exploring
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
            </button>
            <button type="button" (click)="router.navigate(['/circuits'])">Browse tours</button>
          </div>
        </div>

        <form class="hero-booking-card" (ngSubmit)="onSearch()">
          <h2>Plan your adventure</h2>
          <p *ngIf="destinationsLoading" role="status">Loading destinations…</p>
          <p *ngIf="destinationsError" class="api-error" role="alert">{{ destinationsError }}</p>
          <label>
            Destination
            <select [(ngModel)]="destinationId" name="destination" required [disabled]="destinationsLoading || !!destinationsError">
              <option [ngValue]="null">Choose your destination</option>
              <option *ngFor="let d of destinations" [ngValue]="d.id">{{ d.name }}, {{ d.country }}</option>
            </select>
          </label>
          <div class="form-columns">
            <label>Departure date<input type="date" [(ngModel)]="departureDate" name="departureDate" [min]="today" required /></label>
            <label>Return date<input type="date" [(ngModel)]="returnDate" name="returnDate" [min]="departureDate || today" required /></label>
          </div>
          <label>
            Travellers
            <select [(ngModel)]="travelers" name="travelers">
              <option *ngFor="let count of travelerOptions" [ngValue]="count">{{ count }} traveller{{ count > 1 ? 's' : '' }}</option>
            </select>
          </label>
          <p *ngIf="searchError" class="api-error" role="alert">{{ searchError }}</p>
          <button type="submit" [disabled]="destinationsLoading || !!destinationsError">
            Find my trip
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
          </button>
        </form>
      </div>
    </section>

    <section class="content-section">
      <div class="content-shell">
        <app-section-heading eyebrow="Destinations" title="Escape to somewhere extraordinary">
          Explore the destinations in our travel catalogue.
        </app-section-heading>
        <p *ngIf="destinationsLoading" role="status">Loading destinations…</p>
        <p *ngIf="destinationsError" class="api-error" role="alert">{{ destinationsError }}</p>
        <div *ngIf="!destinationsLoading && !destinationsError && destinations.length" class="cards-grid">
          <app-destination-card
            *ngFor="let d of featuredDestinations"
            [destination]="d"
            (book)="goToDestination(d)"
          />
        </div>
        <div *ngIf="!destinationsLoading && !destinationsError && !destinations.length" class="empty-state">
          <h3>No destinations available</h3>
          <p>Destinations will appear here once they are published.</p>
        </div>
        <button class="outline-action" type="button" (click)="goToDestinations()">View all destinations</button>
      </div>
    </section>

    <section class="content-section muted-section">
      <div class="content-shell">
        <app-section-heading eyebrow="Tours" title="Travel at your own pace">
          Choose from available trips and check their dates, prices, and seat availability.
        </app-section-heading>
        <p *ngIf="tripsLoading" role="status">Loading trips…</p>
        <p *ngIf="tripsError" class="api-error" role="alert">{{ tripsError }}</p>
        <div *ngIf="!tripsLoading && !tripsError && trips.length" class="cards-grid">
          <app-trip-card *ngFor="let trip of featuredTrips" [trip]="trip" (book)="goToTrip($event)" />
        </div>
        <div *ngIf="!tripsLoading && !tripsError && !trips.length" class="empty-state">
          <h3>No trips available</h3>
          <p>New trips will appear here once they are published.</p>
        </div>
        <button class="outline-action" type="button" (click)="router.navigate(['/circuits'])">Browse tours</button>
      </div>
    </section>

    <section class="home-about">
      <div class="home-about-image">
        <img
          src="https://images.unsplash.com/photo-1769365684859-363edb643bbf?auto=format&fit=crop&w=1200&q=85"
          alt="Travellers admiring a view" loading="lazy"
        />
        <span><strong>TOUR</strong> your next trip</span>
      </div>
      <div>
        <p>About Tour</p>
        <h2>We create unforgettable travel experiences</h2>
        <span>Our team creates authentic itineraries with the support of local experts and thoughtful guidance at every step.</span>
        <button type="button" (click)="router.navigate(['/a-propos'])">
          Learn more
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
        </button>
      </div>
    </section>

    <app-stats-band
      [showAction]="true"
      [destinationCount]="destinationMetric"
      [tripCount]="tripMetric"
      [availableSeats]="availableSeatsMetric"
      (action)="goToDestinations()"
    />
  `,
})
export class HomePageComponent implements OnInit {
  readonly travelerOptions = [1, 2, 3, 4, 5, 6];
  readonly today = this.localDate(new Date());
  destinations: Destination[] = [];
  trips: Trip[] = [];
  destinationId: number | null = null;
  departureDate = '';
  returnDate = '';
  travelers = 2;
  destinationsLoading = true;
  tripsLoading = true;
  destinationsError = '';
  tripsError = '';
  searchError = '';

  get featuredDestinations(): Destination[] {
    return this.destinations.slice(0, 3);
  }

  get featuredTrips(): Trip[] {
    return this.trips.slice(0, 3);
  }

  get destinationMetric(): string {
    return this.destinationsLoading || this.destinationsError
      ? '—'
      : String(this.destinations.length);
  }

  get tripMetric(): string {
    return this.tripsLoading || this.tripsError ? '—' : String(this.trips.length);
  }

  get availableSeatsMetric(): string {
    return this.tripsLoading || this.tripsError
      ? '—'
      : String(this.trips.reduce((total, trip) => total + trip.available_seats, 0));
  }

  constructor(
    readonly router: Router,
    private readonly destinationService: DestinationService,
    private readonly tripService: TripService,
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
    this.tripService.getAll().subscribe({
      next: (trips) => {
        this.trips = trips;
        this.tripsLoading = false;
      },
      error: (error: unknown) => {
        this.tripsError = apiErrorMessage(error);
        this.tripsLoading = false;
      },
    });
  }

  onSearch(): void {
    this.searchError = '';
    if (!this.destinationId || !this.departureDate || !this.returnDate) {
      this.searchError = 'Choose a destination, departure date, and return date.';
      return;
    }
    if (this.departureDate < this.today) {
      this.searchError = 'The departure date must be today or later.';
      return;
    }
    if (this.returnDate < this.departureDate) {
      this.searchError = 'The return date cannot be before the departure date.';
      return;
    }
    this.router.navigate(['/reservation'], {
      queryParams: {
        destinationId: this.destinationId,
        departureDate: this.departureDate,
        returnDate: this.returnDate,
        travelers: this.travelers,
      },
    });
  }

  goToDestinations(): void {
    this.router.navigate(['/destinations']);
  }

  goToDestination(destination: Destination): void {
    this.router.navigate(['/reservation'], {
      queryParams: { destinationId: destination.id },
    });
  }

  goToTrip(trip: Trip): void {
    this.router.navigate(['/reservation'], {
      queryParams: { tripId: trip.id, destinationId: trip.destination_id },
    });
  }

  private localDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
