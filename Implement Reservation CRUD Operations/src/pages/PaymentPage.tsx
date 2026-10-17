import { useParams } from "react-router";
import { useReservations } from "../app/ReservationContext";
import { trips } from "../data/mockData";
import { Badge, ButtonLink, Icon } from "../components/ui";

export default function PaymentPage() {
  const { reservationId } = useParams();
  const { reservations } = useReservations();
  const reservation = reservations.find((item) => item.id === reservationId);
  if (!reservation) return <section className="page-section container empty-state"><h1>Reservation not found</h1><ButtonLink to="/reservations">View reservations</ButtonLink></section>;
  const trip = trips.find((item) => item.id === reservation.tripId)!;
  const steps = reservation.paymentStatus === "Paid" ? 3 : reservation.paymentStatus === "Refunded" ? 2 : 1;
  return (
    <section className="page-section container payment-page">
      <div className="success-seal"><Icon name="ticket" size={30} /></div>
      <p className="eyebrow">Reservation received</p><h1>{reservation.paymentStatus === "Paid" ? "You're all set." : "Your place is being held."}</h1>
      <p>Reservation <strong>{reservation.id}</strong> for {trip.title}</p>
      <div className="payment-card">
        <div className="payment-card-head"><div><span>Payment status</span><h2>${reservation.total.toLocaleString()}</h2></div><Badge tone={reservation.paymentStatus}>{reservation.paymentStatus}</Badge></div>
        <div className="progress-steps">
          {["Reservation created", "Payment reviewed", "Trip confirmed"].map((label, index) => <div className={index < steps ? "step active" : "step"} key={label}><i>{index + 1}</i><span>{label}</span></div>)}
        </div>
        <div className="payment-summary"><span>Travelers<strong>{reservation.guests}</strong></span><span>Departure<strong>{trip.startDate}</strong></span><span>Booked on<strong>{reservation.bookedOn}</strong></span></div>
      </div>
      <div className="center-actions"><ButtonLink to="/reservations">Manage reservation</ButtonLink><ButtonLink to="/trips" variant="secondary">Explore more trips</ButtonLink></div>
    </section>
  );
}
