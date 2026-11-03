import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DestinationService } from '../../../../core/services/destination.service';
import { TripService } from '../../../../core/services/trip.service';
import { type Destination } from '../../../../core/models/destination.model';
import { type Trip } from '../../../../core/models/trip.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import { TripCardComponent } from '../../../../shared/components/cards/cards.component';
import { PageHeaderComponent } from '../../../../shared/components/site-parts/site-parts.component';

@Component({
  selector: 'app-tours-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, TripCardComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Tours" current="Tours" />
    <main class="listing-page">
      <div class="content-shell">
        <div class="listing-intro">
          <div>
            <p>Available trips</p>
            <h2>Find the tour that suits you</h2>
          </div>
          <label class="sort-field">
            Sort by
            <select [(ngModel)]="sort">
              <option value="date">Departure date (soonest first)</option>
              <option value="low">Price (lowest first)</option>
              <option value="high">Price (highest first)</option>
              <option value="alpha">Destination (A to Z)</option>
            </select>
          </label>
        </div>

        <form class="filters-panel" (ngSubmit)="search()">
          <label>
            Destination
            <select [(ngModel)]="destinationId" name="destinationId" [disabled]="destinationsLoading" (ngModelChange)="search()">
              <option [ngValue]="null">All destinations</option>
              <option *ngFor="let destination of destinations" [ngValue]="destination.id">
                {{ destination.name }}, {{ destination.country }}
              </option>
            </select>
          </label>
          <label>
            Maximum budget (per traveller)
            <select [(ngModel)]="maxPrice" name="maxPrice" (ngModelChange)="search()">
              <option [ngValue]="null">Any budget</option>
              <option [ngValue]="1000">Up to €1,000</option>
              <option [ngValue]="1500">Up to €1,500</option>
              <option [ngValue]="2000">Up to €2,000</option>
              <option [ngValue]="3000">Up to €3,000</option>
              <option [ngValue]="5000">Up to €5,000</option>
            </select>
          </label>
          <label>
            Travellers
            <select [(ngModel)]="travelers" name="travelers" (ngModelChange)="search()">
              <option *ngFor="let count of travelerOptions" [ngValue]="count">
                {{ count }} traveller{{ count > 1 ? 's' : '' }}
              </option>
            </select>
          </label>
          <button type="submit" [disabled]="loading">
            <span *ngIf="loading" class="spinner"></span>
            Search
          </button>
        </form>

        <p *ngIf="loading" role="status">Searching available trips…</p>
        <div *ngIf="error" class="api-error" role="alert">
          <p>{{ error }}</p>
          <button type="button" (click)="search()">Try again</button>
        </div>

        <ng-container *ngIf="!loading && !error">
          <p class="result-count">
            <strong>{{ visibleTrips.length }}</strong> available trip{{ visibleTrips.length !== 1 ? 's' : '' }}
          </p>

          <div *ngIf="visibleTrips.length; else empty" class="cards-grid">
            <app-trip-card
              *ngFor="let trip of visibleTrips"
              [trip]="trip"
              [travelers]="travelers"
              (book)="onBook($event)"
            />
          </div>

          <ng-template #empty>
            <div class="empty-state">
              <h3>No trips found</h3>
              <p>No tours match your search criteria. Try increasing your budget or reducing the number of travellers.</p>
              <button type="button" class="outline-action" (click)="resetFilters()">
                Reset filters
              </button>
            </div>
          </ng-template>
        </ng-container>
      </div>
    </main>
  `,
})
export class ToursPageComponent implements OnInit {
  readonly travelerOptions = [1, 2, 3, 4, 5, 6, 8, 10];
  destinations: Destination[] = [];
  trips: Trip[] = [];
  destinationId: number | null = null;
  maxPrice: number | null = null;
  travelers = 1;
  sort: 'date' | 'low' | 'high' | 'alpha' = 'date';
  loading = true;
  destinationsLoading = true;
  error = '';

  get visibleTrips(): Trip[] {
    let results = [...this.trips];
    if (this.destinationId) {
      results = results.filter((t) => t.destination_id === this.destinationId);
    }
    if (this.maxPrice !== null && this.maxPrice !== undefined) {
      results = results.filter((t) => Number(t.price) <= this.maxPrice!);
    }
    if (this.travelers > 1) {
      results = results.filter((t) => t.available_seats >= this.travelers);
    }
    if (this.sort === 'low') {
      return results.sort((a, b) => Number(a.price) - Number(b.price));
    }
    if (this.sort === 'high') {
      return results.sort((a, b) => Number(b.price) - Number(a.price));
    }
    if (this.sort === 'alpha') {
      return results.sort((a, b) =>
        a.destination.localeCompare(b.destination) || a.title.localeCompare(b.title)
      );
    }
    return results.sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  constructor(
    private readonly destinationService: DestinationService,
    private readonly tripService: TripService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.destinationService.getAll().subscribe({
      next: (destinations) => {
        this.destinations = destinations;
        this.destinationsLoading = false;
      },
      error: () => {
        this.destinationsLoading = false;
      },
    });

    this.route.queryParams.subscribe((params) => {
      if (params['destinationId']) {
        this.destinationId = Number(params['destinationId']);
      }
      if (params['maxPrice']) {
        this.maxPrice = Number(params['maxPrice']);
      }
      if (params['travelers']) {
        this.travelers = Math.max(1, Number(params['travelers']) || 1);
      }
      this.search();
    });
  }

  search(): void {
    this.loading = true;
    this.error = '';
    this.travelers = Math.max(1, Number(this.travelers) || 1);
    this.tripService
      .search({
        destination_id: this.destinationId ?? undefined,
        max_price: this.maxPrice ?? undefined,
        travelers: this.travelers,
      })
      .subscribe({
        next: (trips) => {
          this.trips = trips;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.trips = [];
          this.error = apiErrorMessage(error);
          this.loading = false;
        },
      });
  }

  resetFilters(): void {
    this.destinationId = null;
    this.maxPrice = null;
    this.travelers = 1;
    this.sort = 'date';
    this.search();
  }

  onBook(trip: Trip): void {
    this.router.navigate(['/reservation'], {
      queryParams: {
        tripId: trip.id,
        destinationId: trip.destination_id,
        travelers: this.travelers,
      },
    });
  }
}
