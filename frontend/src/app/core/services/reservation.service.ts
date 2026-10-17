import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Reservation,
  CreateReservationBody,
} from '../../shared/models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly base = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) {}

  /** GET /api/reservations — list demo customer reservations */
  listReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.base);
  }

  /** POST /api/reservations — reserve a trip seat */
  createReservation(body: CreateReservationBody): Observable<Reservation> {
    return this.http.post<Reservation>(this.base, body);
  }

  /** POST /api/reservations/{id}/cancel */
  cancelReservation(reservationId: number): Observable<Reservation> {
    return this.http.post<Reservation>(
      `${this.base}/${reservationId}/cancel`,
      {}
    );
  }
}
