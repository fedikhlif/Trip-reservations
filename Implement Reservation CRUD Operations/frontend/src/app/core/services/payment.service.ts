import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payment } from '../../shared/models';
import { PAYMENTS } from '../data/mock-data';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(ApiService);

  getByReservation(reservationId: string): Observable<Payment | undefined> {
    return environment.useMockData
      ? of(PAYMENTS.find((payment) => payment.reservationId === reservationId))
      : this.api.get<Payment>(`/reservations/${reservationId}/payment`);
  }
}
