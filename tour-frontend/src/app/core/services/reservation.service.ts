import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { type Payment, type PaymentMethod } from '../models/payment.model';
import {
  type BookingResponse,
  type CreateReservationRequest,
  type Reservation,
} from '../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly base = `${environment.apiBaseUrl}/reservations`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.base);
  }

  create(booking: CreateReservationRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(this.base, booking);
  }

  cancel(id: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${id}/cancel`, {});
  }

  pay(id: number, amount: string, method: PaymentMethod): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/${id}/payments`, {
      amount,
      method,
      succeed: true,
    });
  }

  refund(paymentId: number): Observable<Payment> {
    return this.http.post<Payment>(
      `${environment.apiBaseUrl}/payments/${paymentId}/refund`,
      {},
    );
  }
}
