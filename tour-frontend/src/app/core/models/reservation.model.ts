import { type Payment } from './payment.model';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Reservation {
  id: number;
  customer_id: number;
  trip_id: number;
  trip_title: string;
  destination: string;
  country: string;
  start_date: string;
  end_date: string;
  traveler_count: number;
  status: ReservationStatus;
  booking_date: string;
  total_price: string;
  payment: Payment | null;
}

export interface CreateReservationRequest {
  trip_id: number;
  travelers: number;
}

export type BookingResponse = Reservation;
