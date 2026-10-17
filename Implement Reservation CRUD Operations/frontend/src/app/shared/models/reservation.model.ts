export type ReservationStatus = 'Confirmée' | 'En attente' | 'Annulée';
export type PaymentStatus = 'Payé' | 'En attente' | 'Remboursé';

export interface Reservation {
  id: string;
  tripId: number;
  customerId: number;
  customer: string;
  guests: number;
  bookedOn: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  total: number;
}
