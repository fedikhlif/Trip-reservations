export type TripCategory = 'Mer' | 'Montagne' | 'Culture';

export interface Trip {
  id: number;
  destinationId: number;
  title: string;
  location: string;
  country: string;
  category: TripCategory;
  date: string;
  duration: number;
  price: number;
  seats: number;
  rating: number;
  image: string;
  description: string;
  highlights: string[];
}
