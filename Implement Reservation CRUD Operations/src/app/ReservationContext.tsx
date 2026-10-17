import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { initialReservations, trips } from "../data/mockData";
import type { Reservation, ReservationStatus } from "../types";

type ReservationContextValue = {
  reservations: Reservation[];
  createReservation: (tripId: number, guests: number, name: string) => Reservation;
  updateStatus: (id: string, status: ReservationStatus) => void;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState(initialReservations);

  const value = useMemo<ReservationContextValue>(
    () => ({
      reservations,
      createReservation: (tripId, guests, customerName) => {
        const trip = trips.find((item) => item.id === tripId);
        if (!trip) throw new Error("Trip not found");
        const reservation: Reservation = {
          id: `RSV-${Math.floor(3000 + Math.random() * 6000)}`,
          tripId,
          customerName,
          guests,
          bookedOn: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }).format(new Date()),
          status: "Pending",
          paymentStatus: "Pending",
          total: trip.price * guests,
        };
        setReservations((current) => [reservation, ...current]);
        return reservation;
      },
      updateStatus: (id, status) =>
        setReservations((current) =>
          current.map((reservation) =>
            reservation.id === id ? { ...reservation, status } : reservation,
          ),
        ),
    }),
    [reservations],
  );

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservations() {
  const context = useContext(ReservationContext);
  if (!context) throw new Error("useReservations must be used inside ReservationProvider");
  return context;
}
