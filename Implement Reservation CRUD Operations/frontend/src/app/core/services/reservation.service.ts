import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { INITIAL_RESERVATIONS, TRIPS } from '../data/mock-data';
import { Reservation, ReservationStatus } from '../../shared/models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly api = inject(ApiService);
  readonly reservations = signal<Reservation[]>(INITIAL_RESERVATIONS);
  readonly loading = signal(false);

  loadAll(): Observable<Reservation[]> {
    this.loading.set(true);
    const source = environment.useMockData
      ? of(this.reservations())
      : this.api.get<Reservation[]>('/reservations');
    return source.pipe(tap((items) => { this.reservations.set(items); this.loading.set(false); }));
  }

  create(tripId: number, customer: string, guests: number): Observable<Reservation> {
    const trip = TRIPS.find((item) => item.id === tripId);
    if (!trip) throw new Error('Voyage introuvable');
    if (guests < 1 || guests > trip.seats) throw new Error('Nombre de voyageurs invalide');
    const reservation: Reservation = {
      id: `RSV-${Math.floor(3000 + Math.random() * 6000)}`,
      tripId, customerId: 1, customer, guests,
      bookedOn: new Intl.DateTimeFormat('fr-FR').format(new Date()),
      status: 'En attente', paymentStatus: 'En attente', total: trip.price * guests,
    };
    const source = environment.useMockData
      ? of(reservation)
      : this.api.post<Reservation>('/reservations', { tripId, guests });
    return source.pipe(tap((created) => this.reservations.update((items) => [created, ...items])));
  }

  updateStatus(id: string, status: ReservationStatus): Observable<Reservation> {
    const current = this.reservations().find((item) => item.id === id);
    if (!current) throw new Error('Réservation introuvable');
    const updated = { ...current, status };
    const source = environment.useMockData
      ? of(updated)
      : this.api.patch<Reservation>(`/reservations/${id}`, { status });
    return source.pipe(tap((item) => this.reservations.update((items) => items.map((entry) => entry.id === id ? item : entry))));
  }

  getById(id: string): Reservation | undefined {
    return this.reservations().find((item) => item.id === id);
  }
}
