import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TripService } from '../../core/services/trip.service';
import { ReservationService } from '../../core/services/reservation.service';
import { PaymentService } from '../../core/services/payment.service';
import { DestinationService } from '../../core/services/destination.service';
import { Trip, TripSearchParams } from '../../shared/models/trip.model';
import { Reservation } from '../../shared/models/reservation.model';
import { Destination } from '../../shared/models/destination.model';
import { PaymentMethod } from '../../shared/models/payment.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface Notice {
  message: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoadingSpinnerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  // ── Search form state ─────────────────────────────────────────────────────
  /** Selected destination ID (empty string = no filter) */
  selectedDestinationId = signal<string>('');
  departureDate = signal('');
  returnDate = signal('');
  travelers = signal(1);
  maxPrice = signal('');

  // ── Page data ─────────────────────────────────────────────────────────────
  destinations = signal<Destination[]>([]);
  trips = signal<Trip[]>([]);
  reservations = signal<Reservation[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  destinationsLoading = signal(false);
  tripsLoading = signal(false);
  reservationsLoading = signal(false);
  /** True when the backend cannot be reached at all (network / 503) */
  backendUnreachable = signal(false);
  notices = signal<Notice[]>([]);

  // ── Per-reservation payment panel state ───────────────────────────────────
  paymentPanelOpen = signal<Record<number, boolean>>({});
  paymentMethod = signal<Record<number, PaymentMethod>>({});
  paymentOutcome = signal<Record<number, 'succeed' | 'fail'>>({});

  constructor(
    private tripSvc: TripService,
    private reservationSvc: ReservationService,
    private paymentSvc: PaymentService,
    private destinationSvc: DestinationService,
  ) {}

  ngOnInit(): void {
    this.loadDestinations();
    this.loadTrips();
    this.loadReservations();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  loadDestinations(): void {
    this.destinationsLoading.set(true);
    this.destinationSvc.listDestinations().subscribe({
      next: (destinations) => {
        this.destinations.set(destinations);
        this.destinationsLoading.set(false);
        this.backendUnreachable.set(false);
      },
      error: (err: Error) => {
        this.destinationsLoading.set(false);
        // Only show the unreachable banner for network/503 errors
        if (err.message.includes('port 8082') || err.message.includes('indisponible')) {
          this.backendUnreachable.set(true);
        } else {
          this.addNotice(err.message, 'error');
        }
      },
    });
  }

  loadTrips(): void {
    this.tripsLoading.set(true);
    const params: TripSearchParams = {};

    const destId = this.selectedDestinationId();
    if (destId) {
      params.destination_id = parseInt(destId, 10);
    }
    if (this.departureDate()) params.departure_date = this.departureDate();
    if (this.returnDate()) params.return_date = this.returnDate();
    if (this.travelers() > 1) params.travelers = this.travelers();
    if (this.maxPrice()) params.max_price = parseFloat(this.maxPrice());

    this.tripSvc.searchTrips(params).subscribe({
      next: (trips) => {
        this.trips.set(trips);
        this.tripsLoading.set(false);
        this.backendUnreachable.set(false);
      },
      error: (err: Error) => {
        this.tripsLoading.set(false);
        if (err.message.includes('port 8082') || err.message.includes('indisponible')) {
          this.backendUnreachable.set(true);
        } else {
          this.addNotice(err.message, 'error');
        }
      },
    });
  }

  loadReservations(): void {
    this.reservationsLoading.set(true);
    this.reservationSvc.listReservations().subscribe({
      next: (res) => {
        this.reservations.set(res);
        this.reservationsLoading.set(false);
      },
      error: (err: Error) => {
        this.reservationsLoading.set(false);
        // Reservation errors are secondary — don't block the trips display
        if (!this.backendUnreachable()) {
          this.addNotice(err.message, 'error');
        }
      },
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  onSearch(): void {
    // Validate date ordering
    const dep = this.departureDate();
    const ret = this.returnDate();
    if (dep && ret && ret < dep) {
      this.addNotice('La date de retour ne peut pas être antérieure à la date de départ.', 'error');
      return;
    }
    // Validate travelers
    if (this.travelers() < 1) {
      this.addNotice('Le nombre de voyageurs doit être au moins 1.', 'error');
      return;
    }
    this.loadTrips();
  }

  // ── Reserve ───────────────────────────────────────────────────────────────

  reserve(trip: Trip): void {
    this.reservationSvc.createReservation({
      trip_id: trip.id,
      travelers: this.travelers() > 1 ? this.travelers() : 1,
    }).subscribe({
      next: (res) => {
        this.addNotice(`Réservation #${res.id} créée avec succès.`, 'success');
        this.loadTrips();
        this.loadReservations();
      },
      error: (err: Error) => this.addNotice(err.message, 'error'),
    });
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  cancel(reservation: Reservation): void {
    this.reservationSvc.cancelReservation(reservation.id).subscribe({
      next: () => {
        this.addNotice(`Réservation #${reservation.id} annulée.`, 'success');
        this.loadTrips();
        this.loadReservations();
      },
      error: (err: Error) => this.addNotice(err.message, 'error'),
    });
  }

  // ── Payment ───────────────────────────────────────────────────────────────

  togglePaymentPanel(reservationId: number): void {
    const current = this.paymentPanelOpen();
    this.paymentPanelOpen.set({ ...current, [reservationId]: !current[reservationId] });

    const methods = this.paymentMethod();
    if (!methods[reservationId]) {
      this.paymentMethod.set({ ...methods, [reservationId]: 'CREDIT_CARD' });
    }
    const outcomes = this.paymentOutcome();
    if (!outcomes[reservationId]) {
      this.paymentOutcome.set({ ...outcomes, [reservationId]: 'succeed' });
    }
  }

  processPayment(reservation: Reservation): void {
    const method: PaymentMethod = this.paymentMethod()[reservation.id] ?? 'CREDIT_CARD';
    const succeed = (this.paymentOutcome()[reservation.id] ?? 'succeed') === 'succeed';

    this.paymentSvc
      .processPayment(reservation.id, {
        amount: parseFloat(reservation.total_price),
        method,
        succeed,
      })
      .subscribe({
        next: (p) => {
          this.addNotice(`Paiement simulé : ${p.status}.`, 'success');
          this.togglePaymentPanel(reservation.id);
          this.loadReservations();
        },
        error: (err: Error) => this.addNotice(err.message, 'error'),
      });
  }

  refund(reservation: Reservation): void {
    if (!reservation.payment) return;
    this.paymentSvc.refundPayment(reservation.payment.id).subscribe({
      next: (p) => {
        this.addNotice(`Paiement #${p.id} remboursé.`, 'success');
        this.loadReservations();
        this.loadTrips();
      },
      error: (err: Error) => this.addNotice(err.message, 'error'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getPaymentMethod(id: number): PaymentMethod {
    return this.paymentMethod()[id] ?? 'CREDIT_CARD';
  }

  setPaymentMethod(id: number, value: PaymentMethod): void {
    this.paymentMethod.set({ ...this.paymentMethod(), [id]: value });
  }

  getPaymentOutcome(id: number): 'succeed' | 'fail' {
    return this.paymentOutcome()[id] ?? 'succeed';
  }

  setPaymentOutcome(id: number, value: 'succeed' | 'fail'): void {
    this.paymentOutcome.set({ ...this.paymentOutcome(), [id]: value });
  }

  isPanelOpen(id: number): boolean {
    return !!this.paymentPanelOpen()[id];
  }

  /** Format a date string like "2025-07-14" to "JUL" */
  monthAbbr(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00')
      .toLocaleString('fr', { month: 'short' })
      .toUpperCase();
  }

  /** Format a date string to the day number "14" */
  dayNum(dateStr: string): string {
    return String(new Date(dateStr + 'T00:00:00').getDate()).padStart(2, '0');
  }

  /** Format a date string to "14 juil." */
  shortDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleString('fr', {
      day: '2-digit',
      month: 'short',
    });
  }

  /** Format a date string to "14 juil. 2025" */
  longDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleString('fr', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Format ISO datetime to "14 janv. 2025" */
  bookingDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('fr', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Pad id to 4 digits */
  padId(id: number): string {
    return String(id).padStart(4, '0');
  }

  /** Duration in nights between start_date and end_date */
  durationNights(startDate: string, endDate: string): number {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  private addNotice(message: string, type: 'success' | 'error'): void {
    this.notices.update((n) => [...n, { message, type }]);
    setTimeout(() => {
      this.notices.update((n) => n.slice(1));
    }, 7000);
  }
}

