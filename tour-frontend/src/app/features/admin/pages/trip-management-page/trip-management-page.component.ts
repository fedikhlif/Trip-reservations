import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DestinationService } from '../../../../core/services/destination.service';
import { TripService } from '../../../../core/services/trip.service';
import { type Destination } from '../../../../core/models/destination.model';
import { type Trip, type TripWrite } from '../../../../core/models/trip.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

@Component({
  selector: 'app-trip-management-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, RouterLink],
  template: `
    <main class="admin-page">
      <header>
        <p>Administrator</p>
        <h1>{{ editingTrip ? 'Edit trip' : 'Create a trip' }}</h1>
        <span>Fill in the details below to {{ editingTrip ? 'update the' : 'add a new' }} trip.</span>
        <div class="header-links">
          <a routerLink="/admin/catalogue" class="sibling-link">→ View trip catalogue</a>
          <a routerLink="/admin/destinations" class="sibling-link">→ Manage destinations</a>
        </div>
      </header>

      <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
      <p *ngIf="success" class="api-success" role="status">{{ success }}</p>

      <section class="section-card">
        <form class="trip-form" (ngSubmit)="save()">

          <label class="full-width">
            Title
            <input [(ngModel)]="form.title" name="title" maxlength="200" required placeholder="e.g. Kyoto Cherry Blossom Tour" />
          </label>

          <label class="full-width">
            Destination
            <select [(ngModel)]="form.destination_id" name="destination_id" required class="dest-select">
              <option [ngValue]="0" disabled>Select a destination</option>
              <option *ngFor="let d of destinations" [ngValue]="d.id">
                {{ d.name }}, {{ d.country }}
              </option>
            </select>
            <p *ngIf="destinations.length === 0" class="no-dest-warning">
              No destinations yet. <a routerLink="/admin/destinations">Add one first →</a>
            </p>
          </label>

          <label>
            Departure date
            <input type="date" [(ngModel)]="form.start_date" name="start_date" required />
          </label>
          <label>
            Return date
            <input type="date" [(ngModel)]="form.end_date" name="end_date" [min]="form.start_date" required />
          </label>
          <label>
            Price (€)
            <input type="number" [(ngModel)]="form.price" name="price" min="0" step="0.01" required />
          </label>
          <label>
            Available seats
            <input type="number" [(ngModel)]="form.available_seats" name="available_seats" min="1" step="1" required />
          </label>

          <div class="form-actions full-width">
            <button type="submit" [disabled]="working || destinations.length === 0">
              {{ working ? 'Saving…' : (editingTrip ? 'Save changes' : 'Create trip') }}
            </button>
            <button *ngIf="editingTrip" type="button" class="secondary" (click)="reset()">Cancel</button>
          </div>
        </form>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .admin-page { width: min(800px, calc(100% - 40px)); margin: 56px auto 80px; }
    header { margin-bottom: 32px; }
    header p { color: #0780a0; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
    h1, h2, p { margin-top: 0; }
    .header-links { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; }
    .sibling-link { color: #0780a0; font-size: 14px; font-weight: 600; text-decoration: none; }
    .sibling-link:hover { text-decoration: underline; }

    .section-card { background: #f3f7f7; border-radius: 16px; padding: 28px; }

    .trip-form { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .trip-form .full-width { grid-column: 1 / -1; }
    .trip-form label { display: grid; gap: 8px; color: #3a4445; font-size: 14px; font-weight: 600; }
    .trip-form input { min-width: 0; height: 46px; padding: 0 14px; border: 1px solid #c8d3d4; border-radius: 10px; background: #fff; font: inherit; font-size: 15px; transition: border-color 150ms; }
    .trip-form input:focus { outline: none; border-color: #0780a0; box-shadow: 0 0 0 3px rgba(7,128,160,.12); }

    /* Big destination select */
    .dest-select {
      min-width: 0;
      width: 100%;
      height: 54px;
      padding: 0 16px;
      border: 2px solid #0780a0;
      border-radius: 10px;
      background: #fff;
      font: inherit;
      font-size: 16px;
      font-weight: 600;
      color: #1a2c2d;
      cursor: pointer;
      appearance: auto;
      transition: border-color 150ms, box-shadow 150ms;
    }
    .dest-select:focus { outline: none; box-shadow: 0 0 0 3px rgba(7,128,160,.18); }
    .dest-select option { font-size: 15px; padding: 8px 0; }

    .no-dest-warning { color: #7a5500; font-size: 13px; margin: 4px 0 0; }
    .no-dest-warning a { color: #0780a0; font-weight: 600; text-decoration: none; }
    .no-dest-warning a:hover { text-decoration: underline; }

    .form-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding-top: 6px; }
    button { min-height: 44px; padding: 0 24px; border: 0; border-radius: 999px; background: #0780a0; color: #fff; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 150ms; }
    button:hover:not(:disabled) { background: #065f78; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button.secondary { border: 2px solid #0780a0; background: #fff; color: #0780a0; }
    button.secondary:hover:not(:disabled) { background: #e8f5f9; }

    .api-error { color: #b93838; background: #fdf0f0; border: 1px solid #f5c6c6; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
    .api-success { color: #1e6e3a; background: #f0fdf4; border: 1px solid #bbf0cc; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }

    @media (max-width: 640px) {
      .admin-page { margin-top: 32px; }
      .trip-form { grid-template-columns: 1fr; }
    }
  `],
})
export class TripManagementPageComponent implements OnInit {
  destinations: Destination[] = [];
  editingTrip: Trip | null = null;
  working = false;
  error = '';
  success = '';
  form: TripWrite = this.emptyForm();

  constructor(
    private readonly tripService: TripService,
    private readonly destinationService: DestinationService,
  ) {}

  ngOnInit(): void {
    this.destinationService.getAll().subscribe({
      next: (d) => {
        this.destinations = d;
        this.checkSessionEdit();
      },
      error: (err: unknown) => { this.error = apiErrorMessage(err); },
    });
  }

  /** Pick up an edit request handed off from the catalogue page. */
  private checkSessionEdit(): void {
    const raw = sessionStorage.getItem('editTrip');
    if (!raw) return;
    sessionStorage.removeItem('editTrip');
    try {
      const trip: Trip = JSON.parse(raw);
      this.editingTrip = trip;
      this.form = {
        title: trip.title,
        destination_id: trip.destination_id,
        start_date: trip.start_date,
        end_date: trip.end_date,
        price: Number(trip.price),
        available_seats: trip.available_seats,
      };
    } catch { /* ignore */ }
  }

  save(): void {
    this.working = true;
    this.clear();
    const req = this.editingTrip
      ? this.tripService.updateForAdmin(this.editingTrip.id, this.form)
      : this.tripService.createForAdmin(this.form);
    req.subscribe({
      next: () => {
        this.success = this.editingTrip ? 'Trip updated.' : 'Trip created successfully.';
        this.reset();
        this.working = false;
      },
      error: (err: unknown) => { this.error = apiErrorMessage(err); this.working = false; },
    });
  }

  reset(): void { this.editingTrip = null; this.form = this.emptyForm(); }

  private clear(): void { this.error = ''; this.success = ''; }
  private emptyForm(): TripWrite {
    return { title: '', destination_id: 0, start_date: '', end_date: '', price: 0, available_seats: 1 };
  }
}
