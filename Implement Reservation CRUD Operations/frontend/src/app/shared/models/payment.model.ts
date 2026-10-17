import { PaymentStatus } from './reservation.model';

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  status: PaymentStatus;
  method?: 'Carte' | 'Virement';
  paidAt?: string;
}
