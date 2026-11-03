import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { DestinationService } from '../../../../core/services/destination.service';
import { type Destination } from '../../../../core/models/destination.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import { DestinationCardComponent } from '../../../../shared/components/cards/cards.component';
import { PageHeaderComponent } from '../../../../shared/components/site-parts/site-parts.component';

@Component({
  selector: 'app-destinations-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, DestinationCardComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Destinations" current="Destinations" />
    <main class="listing-page">
      <div class="content-shell">
        <div class="listing-intro">
          <div><p>The world is waiting</p><h2>Find your next destination</h2></div>
          <label class="search-field">
            <span class="sr-only">Search destinations</span>
            <input [(ngModel)]="query" placeholder="Search destinations…" />
          </label>
        </div>

        <p *ngIf="loading" role="status">Loading destinations…</p>
        <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
        <ng-container *ngIf="!loading && !error">
          <div *ngIf="visible.length; else empty" class="cards-grid">
            <app-destination-card
              *ngFor="let destination of visible"
              [destination]="destination"
              (book)="goToBooking(destination)"
            />
          </div>
          <ng-template #empty>
            <div class="empty-state">
              <h3>No destinations found</h3>
              <p>{{ destinations.length ? 'Try another keyword.' : 'No destinations are available yet.' }}</p>
            </div>
          </ng-template>
        </ng-container>
      </div>
    </main>
  `,
})
export class DestinationsPageComponent implements OnInit {
  destinations: Destination[] = [];
  query = '';
  loading = true;
  error = '';

  get visible(): Destination[] {
    const query = this.query.trim().toLocaleLowerCase();
    return this.destinations.filter((destination) =>
      `${destination.name} ${destination.country} ${destination.description}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }

  constructor(
    private readonly destinationService: DestinationService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.destinationService.getAll().subscribe({
      next: (destinations) => {
        this.destinations = destinations;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  goToBooking(destination: Destination): void {
    this.router.navigate(['/reservation'], {
      queryParams: { destinationId: destination.id },
    });
  }
}
