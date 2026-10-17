import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { Observable } from 'rxjs';
import { PageHeaderComponent } from '../../../../shared/components/site-parts/site-parts.component';
import { ReservationService } from '../../../../core/services/reservation.service';
import { type PaymentMethod } from '../../../../core/models/payment.model';
import { type Reservation, type ReservationStatus } from '../../../../core/models/reservation.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

type StatusFilter = 'ALL' | ReservationStatus;
type PendingAction = 'cancel' | 'refund';

@Component({
  selector: 'app-my-reservations-page',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, NgClass, PageHeaderComponent],
  template: `
    <app-page-header title="Mes réservations" current="Réservations" />
    <main class="listing-page">
      <div class="content-shell">
        <div class="demo-notice" role="note">
          Espace de démonstration : ces opérations utilisent le compte de test « Jordan Lee ».
          Aucune authentification client n'est configurée.
        </div>

        <div class="platform-title-row">
          <header class="platform-heading">
            <p>Espace personnel</p>
            <h2>Mes réservations</h2>
            <span>Consultez les voyages, les montants enregistrés et les statuts fournis par le serveur.</span>
          </header>
          <label class="platform-filter">
            Filtrer par statut
            <select [(ngModel)]="statusFilter">
              <option value="ALL">Toutes</option>
              <option value="PENDING">En attente</option>
              <option value="CONFIRMED">Confirmée</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </label>
        </div>

        <p *ngIf="loading" role="status">Chargement des réservations…</p>
        <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
        <p *ngIf="success" class="api-success" role="status">{{ success }}</p>

        <ng-container *ngIf="!loading && !error">
          <div *ngIf="filteredReservations.length; else empty" class="reservation-list">
            <article class="reservation-row" *ngFor="let reservation of filteredReservations">
              <div><small>Référence</small><strong>#{{ reservation.id }}</strong></div>
              <div><small>Voyage</small><strong>{{ reservation.trip_title }}</strong></div>
              <div><small>Dates</small><strong>{{ formatDate(reservation.start_date) }} – {{ formatDate(reservation.end_date) }}</strong></div>
              <div><small>Voyageurs</small><strong>{{ reservation.traveler_count }}</strong></div>
              <div><small>Montant</small><strong>{{ formatPrice(reservation.total_price) }}</strong></div>
              <span class="status-badge" [ngClass]="statusClass(reservation.status)">{{ statusLabel(reservation.status) }}</span>
              <div class="reservation-actions">
                <button type="button" (click)="selectedReservation = reservation">Détails</button>
                <label *ngIf="reservation.status === 'PENDING' && !reservation.payment" class="payment-method">
                  Mode de paiement (simulation)
                  <select [(ngModel)]="paymentMethod" [ngModelOptions]="{ standalone: true }">
                    <option value="CREDIT_CARD">Carte bancaire</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="BANK_TRANSFER">Virement</option>
                  </select>
                </label>
                <button
                  *ngIf="reservation.status === 'PENDING' && !reservation.payment"
                  type="button"
                  [disabled]="workingId === reservation.id"
                  (click)="pay(reservation)"
                >Simuler le paiement</button>
                <button
                  *ngIf="canCancel(reservation)"
                  type="button"
                  [disabled]="workingId === reservation.id"
                  (click)="requestAction(reservation, 'cancel')"
                >Annuler</button>
                <button
                  *ngIf="reservation.payment?.status === 'COMPLETED'"
                  type="button"
                  [disabled]="workingId === reservation.id"
                  (click)="requestAction(reservation, 'refund')"
                >Simuler le remboursement</button>
              </div>
            </article>
          </div>
          <ng-template #empty>
            <div class="empty-state">
              <h3>Aucune réservation</h3>
              <p>Les réservations créées pour le compte de démonstration apparaîtront ici.</p>
            </div>
          </ng-template>
        </ng-container>

        <div *ngIf="selectedReservation" class="platform-modal-backdrop" (click)="selectedReservation = null">
          <section class="reservation-detail-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-title" (click)="$event.stopPropagation()">
            <button class="platform-close" type="button" (click)="selectedReservation = null" aria-label="Fermer">×</button>
            <small>Réservation #{{ selectedReservation.id }}</small>
            <h2 id="reservation-title">{{ selectedReservation.trip_title }}</h2>
            <p>{{ selectedReservation.destination }}, {{ selectedReservation.country }}</p>
            <span class="status-badge" [ngClass]="statusClass(selectedReservation.status)">{{ statusLabel(selectedReservation.status) }}</span>
            <div class="reservation-detail-grid">
              <div><span>Dates</span><strong>{{ formatDate(selectedReservation.start_date) }} – {{ formatDate(selectedReservation.end_date) }}</strong></div>
              <div><span>Voyageurs</span><strong>{{ selectedReservation.traveler_count }}</strong></div>
              <div><span>Montant</span><strong>{{ formatPrice(selectedReservation.total_price) }}</strong></div>
              <div><span>Paiement</span><strong>{{ paymentLabel(selectedReservation) }}</strong></div>
            </div>
            <p>Le paiement et le remboursement disponibles dans cette démo sont simulés ; aucun prestataire bancaire n'est connecté.</p>
          </section>
        </div>

        <div *ngIf="actionTarget" class="platform-modal-backdrop">
          <section class="confirm-dialog" role="alertdialog" aria-modal="true">
            <span>!</span>
            <h2>{{ pendingAction === 'cancel' ? 'Confirmer l’annulation ?' : 'Confirmer le remboursement simulé ?' }}</h2>
            <p>
              {{ pendingAction === 'cancel'
                ? 'La réservation #' + actionTarget.id + ' sera annulée et ses places libérées.'
                : 'Le paiement de la réservation #' + actionTarget.id + ' sera marqué comme remboursé et la réservation annulée.' }}
            </p>
            <div>
              <button type="button" (click)="actionTarget = null">Retour</button>
              <button type="button" [disabled]="workingId === actionTarget.id" (click)="executeAction()">Confirmer</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  `,
})
export class MyReservationsPageComponent implements OnInit {
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
        this.success = `Paiement simulé : ${payment.status === 'COMPLETED' ? 'réservation confirmée' : 'paiement refusé'}.`;
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
      this.error = 'Aucun paiement remboursable n’est associé à cette réservation.';
      this.actionTarget = null;
      this.pendingAction = null;
      this.workingId = null;
      return;
    }
    operation.subscribe({
      next: () => {
        this.success = action === 'cancel'
          ? 'La réservation a été annulée.'
          : 'Le remboursement simulé a été enregistré et la réservation annulée.';
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
      ? 'En attente'
      : status === 'CONFIRMED'
        ? 'Confirmée'
        : 'Annulée';
  }

  paymentLabel(reservation: Reservation): string {
    if (!reservation.payment) {
      return 'Non réglé';
    }
    if (reservation.payment.status === 'COMPLETED') {
      return 'Réglé (simulation)';
    }
    if (reservation.payment.status === 'REFUNDED') {
      return 'Remboursé (simulation)';
    }
    return reservation.payment.status === 'FAILED'
      ? 'Échec (simulation)'
      : 'En attente (simulation)';
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
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  }
}
