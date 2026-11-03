import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/site-parts/site-parts.component';
import { ReservationService } from '../../../../core/services/reservation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { type PaymentMethod } from '../../../../core/models/payment.model';
import { type Reservation, type ReservationStatus } from '../../../../core/models/reservation.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

type StatusFilter = 'ALL' | ReservationStatus;
type PendingAction = 'cancel' | 'refund';

@Component({
  selector: 'app-my-reservations-page',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, NgClass, PageHeaderComponent, RouterLink],
  template: `
    <app-page-header title="My bookings" current="Bookings" />
    <main class="listing-page">
      <div class="content-shell">

        <div class="platform-title-row">
          <header class="platform-heading">
            <p>Personal area</p>
            <h2>Hello, {{ auth.firstName() }} 👋</h2>
            <span>View your booked trips, their status, and your payments.</span>
          </header>
          <label class="platform-filter">
            Filter by status
            <select [(ngModel)]="statusFilter">
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        </div>

        <p *ngIf="loading" class="page-loader" role="status">
          <i aria-hidden="true"></i>Loading bookings…
        </p>
        <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
        <p *ngIf="success" class="api-success" role="status">{{ success }}</p>

        <ng-container *ngIf="!loading && !error">
          <div *ngIf="filteredReservations.length; else empty" class="reservation-list">
            <article class="reservation-row" *ngFor="let reservation of filteredReservations">
              <div><small>Reference</small><strong>#{{ reservation.id }}</strong></div>
              <div><small>Trip</small><strong>{{ reservation.trip_title }}</strong></div>
              <div><small>Dates</small><strong>{{ formatDate(reservation.start_date) }} – {{ formatDate(reservation.end_date) }}</strong></div>
              <div><small>Travellers</small><strong>{{ reservation.traveler_count }}</strong></div>
              <div><small>Amount</small><strong>{{ formatPrice(reservation.total_price) }}</strong></div>
              <span class="status-badge" [ngClass]="statusClass(reservation.status)">{{ statusLabel(reservation.status) }}</span>
              <div class="reservation-actions">
                <button type="button" (click)="selectedReservation = reservation">Details</button>
                <label *ngIf="reservation.status === 'PENDING' && !reservation.payment" class="payment-method">
                  Payment method (simulated)
                  <select [(ngModel)]="paymentMethod" [ngModelOptions]="{ standalone: true }">
                    <option value="CREDIT_CARD">Credit card</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                  </select>
                </label>
                <button
                  *ngIf="reservation.status === 'PENDING' && !reservation.payment"
                  type="button"
                  [disabled]="workingId === reservation.id"
                  (click)="pay(reservation)"
                >Simulate payment</button>
                <button
                  *ngIf="canCancel(reservation)"
                  type="button"
                  [disabled]="workingId === reservation.id"
                  (click)="requestAction(reservation, 'cancel')"
                >Cancel</button>
                <button
                  *ngIf="reservation.payment?.status === 'COMPLETED'"
                  type="button"
                  [disabled]="workingId === reservation.id"
                  (click)="requestAction(reservation, 'refund')"
                >Simulate refund</button>
              </div>
            </article>
          </div>
          <ng-template #empty>
            <div class="empty-state">
              <h3>No bookings yet</h3>
              <p>You don't have any bookings yet. Explore our trips!</p>
              <a routerLink="/destinations" class="outline-action" style="display:inline-flex;align-items:center;gap:8px;margin-top:20px;">
                Explore destinations
              </a>
            </div>
          </ng-template>
        </ng-container>

        <!-- Detail modal -->
        <div *ngIf="selectedReservation" class="platform-modal-backdrop" (click)="selectedReservation = null">
          <section class="reservation-detail-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-title" (click)="$event.stopPropagation()">
            <button class="platform-close" type="button" (click)="selectedReservation = null" aria-label="Close">×</button>
            <small>Booking #{{ selectedReservation.id }}</small>
            <h2 id="reservation-title">{{ selectedReservation.trip_title }}</h2>
            <p>{{ selectedReservation.destination }}, {{ selectedReservation.country }}</p>
            <span class="status-badge" [ngClass]="statusClass(selectedReservation.status)">{{ statusLabel(selectedReservation.status) }}</span>
            <div class="reservation-detail-grid">
              <div><span>Dates</span><strong>{{ formatDate(selectedReservation.start_date) }} – {{ formatDate(selectedReservation.end_date) }}</strong></div>
              <div><span>Travellers</span><strong>{{ selectedReservation.traveler_count }}</strong></div>
              <div><span>Amount</span><strong>{{ formatPrice(selectedReservation.total_price) }}</strong></div>
              <div><span>Payment</span><strong>{{ paymentLabel(selectedReservation) }}</strong></div>
            </div>
            <p>Payments and refunds in this demo are simulated; no payment provider is connected.</p>
          </section>
        </div>

        <!-- Confirm dialog -->
        <div *ngIf="actionTarget" class="platform-modal-backdrop">
          <section class="confirm-dialog" role="alertdialog" aria-modal="true">
            <span>!</span>
            <h2>{{ pendingAction === 'cancel' ? 'Cancel this booking?' : 'Confirm simulated refund?' }}</h2>
            <p>
              {{ pendingAction === 'cancel'
                ? 'Booking #' + actionTarget.id + ' will be cancelled and its seats released.'
                : 'The payment for booking #' + actionTarget.id + ' will be marked as refunded and the booking cancelled.' }}
            </p>
            <div>
              <button type="button" (click)="actionTarget = null">Back</button>
              <button type="button" [disabled]="workingId === actionTarget.id" (click)="executeAction()">Confirm</button>
            </div>
          </section>
        </div>

      </div>
    </main>
  `,
})
export class MyReservationsPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  reservations: Reservation[] = [];
  statusFilter: StatusFilter = 'ALL';
  paymentMethod: PaymentMethod = 'CREDIT_CARD';
  selectedReservation: Reservation | null = null;
  actionTarget: Reservation | null = null;
  pendingAction: PendingAction | null = null;
  loading = true;
  error = '';
  success = '';
  workingId: number | null = null;

  get filteredReservations(): Reservation[] {
    return this.reservations.filter(
      (reservation) =>
        this.statusFilter === 'ALL' || reservation.status === this.statusFilter,
    );
  }

  constructor(private readonly reservationService: ReservationService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';
    this.reservationService.getAll().subscribe({
      next: (reservations) => {
        this.reservations = reservations;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  pay(reservation: Reservation): void {
    this.workingId = reservation.id;
    this.error = '';
    this.success = '';
    this.reservationService.pay(
      reservation.id,
      reservation.total_price,
      this.paymentMethod,
    ).subscribe({
      next: (payment) => {
        this.success = `Simulated payment: ${payment.status === 'COMPLETED' ? 'booking confirmed' : 'payment declined'}.`;
        this.workingId = null;
        this.refresh();
      },
      error: (error: unknown) => {
        this.error = apiErrorMessage(error);
        this.workingId = null;
      },
    });
  }

  requestAction(reservation: Reservation, action: PendingAction): void {
    this.actionTarget = reservation;
    this.pendingAction = action;
  }

  executeAction(): void {
    if (!this.actionTarget || !this.pendingAction) {
      return;
    }
    const reservation = this.actionTarget;
    const action = this.pendingAction;
    this.workingId = reservation.id;
    this.error = '';
    this.success = '';
    let operation: Observable<unknown> | null = null;
    if (action === 'cancel') {
      operation = this.reservationService.cancel(reservation.id);
    } else if (reservation.payment) {
      operation = this.reservationService.refund(reservation.payment.id);
    }
    if (!operation) {
      this.error = 'No refundable payment is associated with this booking.';
      this.actionTarget = null;
      this.pendingAction = null;
      this.workingId = null;
      return;
    }
    operation.subscribe({
      next: () => {
        this.success = action === 'cancel'
          ? 'The booking has been cancelled.'
          : 'The simulated refund has been recorded and the booking cancelled.';
        this.actionTarget = null;
        this.pendingAction = null;
        this.workingId = null;
        this.refresh();
      },
      error: (error: unknown) => {
        this.error = apiErrorMessage(error);
        this.actionTarget = null;
        this.pendingAction = null;
        this.workingId = null;
      },
    });
  }

  canCancel(reservation: Reservation): boolean {
    return reservation.status !== 'CANCELLED'
      && reservation.payment?.status !== 'COMPLETED';
  }

  statusClass(status: ReservationStatus): Record<string, boolean> {
    return {
      'status-en-attente': status === 'PENDING',
      'status-confirmee': status === 'CONFIRMED',
      'status-annulee': status === 'CANCELLED',
    };
  }

  statusLabel(status: ReservationStatus): string {
    return status === 'PENDING'
      ? 'Pending'
      : status === 'CONFIRMED'
        ? 'Confirmed'
        : 'Cancelled';
  }

  paymentLabel(reservation: Reservation): string {
    if (!reservation.payment) {
      return 'Unpaid';
    }
    if (reservation.payment.status === 'COMPLETED') {
      return 'Paid (simulated)';
    }
    if (reservation.payment.status === 'REFUNDED') {
      return 'Refunded (simulated)';
    }
    return reservation.payment.status === 'FAILED'
      ? 'Failed (simulated)'
      : 'Pending (simulated)';
  }

  formatPrice(amount: string): string {
    return new Intl.NumberFormat('en-IE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  }
}
