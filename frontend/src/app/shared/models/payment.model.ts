export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CREDIT_CARD' | 'PAYPAL' | 'BANK_TRANSFER';

/** Payment object embedded inside a Reservation */
export interface Payment {
  id: number;
  reservation_id: number;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
}

/** Body for POST /api/reservations/{id}/payments */
export interface CreatePaymentBody {
  amount: number;
  method: PaymentMethod;
  succeed: boolean;
}
