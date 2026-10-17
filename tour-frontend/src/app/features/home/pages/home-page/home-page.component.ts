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
          <p><i></i>Explorez le monde avec nous</p>
          <h1>Découvrez votre voyage idéal</h1>
          <span>Des aventures inoubliables, des destinations d'exception et des souvenirs qui durent toute une vie.</span>
          <div>
            <button type="button" (click)="goToDestinations()">
              Commencer l'exploration
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
            </button>
            <button type="button" (click)="router.navigate(['/circuits'])">Parcourir les circuits</button>
          </div>
        </div>

        <form class="hero-booking-card" (ngSubmit)="onSearch()">
          <h2>Planifiez votre aventure</h2>
          <p *ngIf="destinationsLoading" role="status">Chargement des destinations…</p>
          <p *ngIf="destinationsError" class="api-error" role="alert">{{ destinationsError }}</p>
          <label>
            Destination
            <select [(ngModel)]="destinationId" name="destination" required [disabled]="destinationsLoading || !!destinationsError">
              <option [ngValue]="null">Choisissez votre destination</option>
              <option *ngFor="let d of destinations" [ngValue]="d.id">{{ d.name }}, {{ d.country }}</option>
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
          <p *ngIf="searchError" class="api-error" role="alert">{{ searchError }}</p>
          <button type="submit" [disabled]="destinationsLoading || !!destinationsError">
            Trouver mon voyage
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
          </button>
        </form>
      </div>
    </section>

    <section class="content-section">
      <div class="content-shell">
        <app-section-heading eyebrow="Destinations" title="Évadez-vous vers l'exception">
          Découvrez les destinations enregistrées dans notre catalogue de voyages.
        </app-section-heading>
        <p *ngIf="destinationsLoading" role="status">Chargement des destinations…</p>
        <p *ngIf="destinationsError" class="api-error" role="alert">{{ destinationsError }}</p>
        <div *ngIf="!destinationsLoading && !destinationsError && destinations.length" class="cards-grid">
          <app-destination-card
            *ngFor="let d of featuredDestinations"
            [destination]="d"
            (book)="goToDestination(d)"
          />
        </div>
        <div *ngIf="!destinationsLoading && !destinationsError && !destinations.length" class="empty-state">
          <h3>Aucune destination disponible</h3>
          <p>Les destinations apparaîtront ici dès qu'elles seront publiées.</p>
        </div>
        <button class="outline-action" type="button" (click)="goToDestinations()">Voir toutes les destinations</button>
      </div>
    </section>

    <section class="content-section muted-section">
      <div class="content-shell">
        <app-section-heading eyebrow="Circuits" title="Voyagez à votre rythme">
          Choisissez parmi les voyages réellement disponibles et consultez leurs dates, prix et places.
        </app-section-heading>
        <p *ngIf="tripsLoading" role="status">Chargement des voyages…</p>
        <p *ngIf="tripsError" class="api-error" role="alert">{{ tripsError }}</p>
        <div *ngIf="!tripsLoading && !tripsError && trips.length" class="cards-grid">
          <app-trip-card *ngFor="let trip of featuredTrips" [trip]="trip" (book)="goToTrip($event)" />
        </div>
        <div *ngIf="!tripsLoading && !tripsError && !trips.length" class="empty-state">
          <h3>Aucun voyage disponible</h3>
          <p>Les prochains voyages publiés apparaîtront ici.</p>
        </div>
        <button class="outline-action" type="button" (click)="router.navigate(['/circuits'])">Parcourir les circuits</button>
      </div>
    </section>

    <section class="home-about">
      <div class="home-about-image">
        <img
          src="https://images.unsplash.com/photo-1769365684859-363edb643bbf?auto=format&fit=crop&w=1200&q=85"
          alt="Voyageurs admirant un panorama" loading="lazy"
        />
        <span><strong>TOUR</strong> votre prochain voyage</span>
      </div>
      <div>
        <p>À propos de Tour</p>
        <h2>Nous créons des expériences de voyage inoubliables</h2>
        <span>Notre équipe imagine des itinéraires authentiques, soutenus par des experts locaux et un accompagnement attentif à chaque étape.</span>
        <button type="button" (click)="router.navigate(['/a-propos'])">
          En savoir plus
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
      this.searchError = 'Choisissez une destination ainsi que vos dates de départ et de retour.';
      return;
    }
    if (this.departureDate < this.today) {
      this.searchError = 'La date de départ doit être aujourd’hui ou ultérieure.';
      return;
    }
    if (this.returnDate < this.departureDate) {
      this.searchError = 'La date de retour ne peut pas précéder la date de départ.';
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
