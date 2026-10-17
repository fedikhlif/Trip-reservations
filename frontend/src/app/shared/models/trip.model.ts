/** Trip returned by GET /api/trips */
export interface Trip {
  id: number;
  destination_id: number;
  title: string;
  destination: string;
  country: string;
  start_date: string;   // ISO date string
  end_date: string;     // ISO date string
  price: string;        // decimal string e.g. "1299.00"
  available_seats: number;
}

/** Search params for GET /api/trips */
export interface TripSearchParams {
  destination?: string;
  destination_id?: number;
  date?: string;            // ISO date (legacy generic filter)
  departure_date?: string;  // ISO date — trip must depart on or after this date
  return_date?: string;     // ISO date — trip must return on or before this date
  travelers?: number;       // minimum available seats required
  max_price?: number;
}
