export interface Trip {
  id: number;
  destination_id: number;
  title: string;
  destination: string;
  country: string;
  start_date: string;
  end_date: string;
  price: string;
  available_seats: number;
}

export interface TripWrite {
  title: string;
  destination_id: number;
  start_date: string;
  end_date: string;
  price: number;
  available_seats: number;
}

export interface TripSearch {
  destination_id?: number;
  departure_date?: string;
  return_date?: string;
  travelers?: number;
  max_price?: number;
}
