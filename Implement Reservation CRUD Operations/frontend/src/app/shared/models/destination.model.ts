export interface Destination {
  id: number;
  name: string;
  country: string;
  category: 'Mer' | 'Montagne' | 'Culture';
  imageUrl: string;
  description: string;
}
