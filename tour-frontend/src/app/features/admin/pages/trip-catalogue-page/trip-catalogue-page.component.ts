import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TripService } from '../../../../core/services/trip.service';
import { type Trip } from '../../../../core/models/trip.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

@Component({
  selector: 'app-trip-catalogue-page',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <main class="admin-page">
      <header>
        <p>Administrator</p>
        <h1>Trip catalogue</h1>
        <span>All trips in the system — edit or delete from here.</span>
        <a routerLink="/admin/trips" class="sibling-link">← Create a trip</a>
      </header>

      <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
      <p *ngIf="success" class="api-success" role="status">{{ success }}</p>

      <section class="section-card">
        <p *ngIf="loading" role="status">Loading trips…</p>
        <p *ngIf="!loading && !trips.length" class="empty">No trips found. <a routerLink="/admin/trips">Create one →</a></p>

        <article class="trip-row" *ngFor="let trip of trips">
          <div class="trip-info">
            <h3>{{ trip.title }}</h3>
            <p class="trip-meta">
              <span class="badge-dest">{{ trip.destination }}, {{ trip.country }}</span>
              <span class="sep">·</span>
              {{ trip.start_date }} – {{ trip.end_date }}
            </p>
            <div class="trip-stats">
              <span class="stat price">€{{ trip.price }}</span>
              <span class="stat seats">{{ trip.available_seats }} seat{{ trip.available_seats !== 1 ? 's' : '' }} available</span>
            </div>
          </div>
          <div class="row-actions">
            <button type="button" class="secondary" (click)="editRoute(trip)">Edit</button>
            <button type="button" class="danger" [disabled]="working" (click)="remove(trip)">Delete</button>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .admin-page { width: min(1000px, calc(100% - 40px)); margin: 56px auto 80px; }
    header { margin-bottom: 28px; }
    header p { color: #0780a0; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
    h1, h2, h3, p { margin-top: 0; }
    .sibling-link { display: inline-block; margin-top: 10px; color: #0780a0; font-size: 14px; font-weight: 600; text-decoration: none; }
    .sibling-link:hover { text-decoration: underline; }

    .section-card { background: #f3f7f7; border-radius: 16px; padding: 24px; }

    .empty { color: #596667; }
    .empty a { color: #0780a0; font-weight: 600; text-decoration: none; }
    .empty a:hover { text-decoration: underline; }

    .trip-row { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 20px 0; border-bottom: 1px solid #dfe7e7; }
    .trip-row:last-child { border-bottom: none; }
    .trip-info { flex: 1; min-width: 0; }
    .trip-info h3 { font-size: 17px; font-weight: 700; margin-bottom: 6px; color: #1a2c2d; }
    .trip-meta { color: #596667; font-size: 14px; margin-bottom: 8px; }
    .badge-dest { font-weight: 600; color: #0780a0; }
    .sep { margin: 0 6px; }
    .trip-stats { display: flex; gap: 16px; }
    .stat { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
    .price { background: #e6f4f8; color: #0780a0; }
    .seats { background: #f0fdf4; color: #1e6e3a; }

    .row-actions { display: flex; gap: 10px; flex-shrink: 0; }
    button { min-height: 38px; padding: 0 18px; border: 0; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    button.secondary { border: 1px solid #0780a0; background: #fff; color: #0780a0; }
    button.danger { background: #b93838; color: #fff; }

    .api-error { color: #b93838; background: #fdf0f0; border: 1px solid #f5c6c6; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
    .api-success { color: #1e6e3a; background: #f0fdf4; border: 1px solid #bbf0cc; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }

    @media (max-width: 640px) {
      .admin-page { margin-top: 32px; }
      .trip-row { flex-direction: column; align-items: flex-start; gap: 12px; }
    }
  `],
})
export class TripCataloguePageComponent implements OnInit {
  trips: Trip[] = [];
  loading = true;
  working = false;
  error = '';
  success = '';

  constructor(private readonly tripService: TripService) {}

  ngOnInit(): void { this.load(); }

  editRoute(trip: Trip): void {
    // Navigate to manage-trips and pre-select via query param is complex;
    // for now we use sessionStorage to hand off the trip to edit.
    sessionStorage.setItem('editTrip', JSON.stringify(trip));
    window.location.href = '/admin/trips';
  }

  remove(trip: Trip): void {
    if (!window.confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
    this.working = true;
    this.error = '';
    this.tripService.deleteForAdmin(trip.id).subscribe({
      next: () => { this.success = `"${trip.title}" deleted.`; this.working = false; this.load(); },
      error: (err: unknown) => { this.error = apiErrorMessage(err); this.working = false; },
    });
  }

  private load(): void {
    this.loading = true;
    this.tripService.getAllForAdmin().subscribe({
      next: (trips) => { this.trips = trips; this.loading = false; },
      error: (err: unknown) => { this.error = apiErrorMessage(err); this.loading = false; },
    });
  }
}

