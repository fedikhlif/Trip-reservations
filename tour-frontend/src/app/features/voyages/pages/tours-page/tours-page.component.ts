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
    <app-page-header title="Circuits" current="Circuits" />
    <main class="listing-page">
      <div class="content-shell">
        <div class="listing-intro">
          <div>
            <p>Voyages disponibles</p>
            <h2>Choisissez le circuit qui vous ressemble</h2>
          </div>
          <label class="sort-field">
            Trier par
            <select [(ngModel)]="sort">
              <option value="date">Date de départ (plus proche)</option>
              <option value="low">Prix croissant</option>
              <option value="high">Prix décroissant</option>
              <option value="alpha">Destination (A à Z)</option>
            </select>
          </label>
        </div>

        <form class="filters-panel" (ngSubmit)="search()">
          <label>
            Destination
            <select [(ngModel)]="destinationId" name="destinationId" [disabled]="destinationsLoading" (ngModelChange)="search()">
              <option [ngValue]="null">Toutes les destinations</option>
              <option *ngFor="let destination of destinations" [ngValue]="destination.id">
                {{ destination.name }}, {{ destination.country }}
              </option>
            </select>
          </label>
          <label>
            Budget maximal (par voyageur)
            <select [(ngModel)]="maxPrice" name="maxPrice" (ngModelChange)="search()">
              <option [ngValue]="null">Tous les budgets</option>
              <option [ngValue]="1000">Jusqu'à 1 000 €</option>
              <option [ngValue]="1500">Jusqu'à 1 500 €</option>
              <option [ngValue]="2000">Jusqu'à 2 000 €</option>
              <option [ngValue]="3000">Jusqu'à 3 000 €</option>
              <option [ngValue]="5000">Jusqu'à 5 000 €</option>
            </select>
          </label>
          <label>
            Voyageurs
            <select [(ngModel)]="travelers" name="travelers" (ngModelChange)="search()">
              <option *ngFor="let count of travelerOptions" [ngValue]="count">
                {{ count }} voyageur{{ count > 1 ? 's' : '' }}
              </option>
            </select>
          </label>
          <button type="submit" [disabled]="loading">
            <span *ngIf="loading" class="spinner"></span>
            Rechercher
          </button>
        </form>

        <p *ngIf="loading" role="status">Recherche des voyages disponibles…</p>
        <div *ngIf="error" class="api-error" role="alert">
          <p>{{ error }}</p>
          <button type="button" (click)="search()">Réessayer</button>
        </div>

        <ng-container *ngIf="!loading && !error">
          <p class="result-count">
            <strong>{{ visibleTrips.length }}</strong> voyage{{ visibleTrips.length !== 1 ? 's' : '' }} disponible{{ visibleTrips.length !== 1 ? 's' : '' }}
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
              <h3>Aucun voyage trouvé</h3>
              <p>Aucun circuit ne correspond à vos critères de recherche. Essayez d'augmenter votre budget ou de réduire le nombre de voyageurs.</p>
              <button type="button" class="outline-action" (click)="resetFilters()">
                Réinitialiser les filtres
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
