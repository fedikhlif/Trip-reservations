export type PaymentMethod = 'CREDIT_CARD' | 'PAYPAL' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: number;
  reservation_id: number;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
}
