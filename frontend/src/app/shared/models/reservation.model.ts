import { Payment } from './payment.model';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

/** Reservation returned by GET /api/reservations */
export interface Reservation {
  id: number;
  customer_id: number;
  trip_id: number;
  trip_title: string;
  destination: string;
  country: string;
  start_date: string;   // ISO date string
  end_date: string;     // ISO date string
  traveler_count: number;
  status: ReservationStatus;
  booking_date: string; // ISO datetime string
  total_price: string;  // decimal string
  payment: Payment | null;
}

/** Body for POST /api/reservations */
export interface CreateReservationBody {
  trip_id: number;
  travelers?: number; // defaults to 1 on the backend
}
