export type Trip = {
  id: number;
  title: string;
  location: string;
  country: string;
  category: "Coast" | "Mountains" | "Culture";
  startDate: string;
  duration: number;
  price: number;
  seats: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  highlights: string[];
};

export type ReservationStatus = "Confirmed" | "Pending" | "Cancelled";
export type PaymentStatus = "Paid" | "Pending" | "Refunded";

export type Reservation = {
  id: string;
  tripId: number;
  customerName: string;
  guests: number;
  bookedOn: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  total: number;
};
