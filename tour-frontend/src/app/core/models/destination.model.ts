export interface Destination {
  id: number;
  name: string;
  country: string;
  description: string;
  image_url?: string;
}

export interface DestinationWrite {
  name: string;
  country: string;
  description: string;
}
