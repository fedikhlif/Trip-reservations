import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payment, CreatePaymentBody } from '../../shared/models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** POST /api/reservations/{id}/payments — simulate payment */
  processPayment(
    reservationId: number,
    body: CreatePaymentBody
  ): Observable<Payment> {
    return this.http.post<Payment>(
      `${this.base}/reservations/${reservationId}/payments`,
      body
    );
  }

  /** POST /api/payments/{id}/refund */
  refundPayment(paymentId: number): Observable<Payment> {
    return this.http.post<Payment>(
      `${this.base}/payments/${paymentId}/refund`,
      {}
    );
  }
}
