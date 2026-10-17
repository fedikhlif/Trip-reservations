import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useReservations } from "../app/ReservationContext";
import { Badge, Button, ButtonLink, Field, Icon } from "../components/ui";
import { trips } from "../data/mockData";

export default function TripDetailsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { createReservation } = useReservations();
  const trip = trips.find((item) => item.id === Number(tripId));
  const [name, setName] = useState("Maya Bennett");
  const [guests, setGuests] = useState(2);
  const [error, setError] = useState("");

  if (!trip) return <section className="page-section container empty-state"><h1>Trip not found</h1><ButtonLink to="/trips">Browse trips</ButtonLink></section>;

  function reserve(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Please enter the lead traveler's name.");
    if (guests < 1 || guests > trip!.seats) return setError(`Choose between 1 and ${trip!.seats} travelers.`);
    const reservation = createReservation(trip!.id, guests, name.trim());
    navigate(`/payment/${reservation.id}`);
  }

  return (
    <>
      <section className="detail-hero">
        <img src={trip.image} alt={`${trip.location}, ${trip.country}`} />
        <div className="detail-overlay" />
        <div className="container detail-title"><Badge tone="light">{trip.category}</Badge><h1>{trip.title}</h1><p><Icon name="location" />{trip.location}, {trip.country}</p></div>
      </section>
      <section className="container detail-layout">
        <div className="detail-copy">
          <p className="eyebrow">The journey</p><h2>See the familiar<br />with fresh eyes.</h2><p className="lead">{trip.description}</p>
          <div className="fact-row"><div><span>Duration</span><strong>{trip.duration} days</strong></div><div><span>Departure</span><strong>{trip.startDate}</strong></div><div><span>Group size</span><strong>Max 14</strong></div></div>
          <h3>Trip highlights</h3>
          <ul className="highlights">{trip.highlights.map((highlight) => <li key={highlight}><span>✓</span>{highlight}</li>)}</ul>
        </div>
        <aside className="booking-card">
          <p>From</p><div className="booking-price">${trip.price.toLocaleString()} <span>/ person</span></div>
          <div className="availability"><span className="status-dot" /> {trip.seats} spaces available</div>
          <form onSubmit={reserve}>
            <Field label="Lead traveler" value={name} onChange={(event) => setName(event.target.value)} />
            <Field label="Travelers" type="number" min={1} max={trip.seats} value={guests} onChange={(event) => setGuests(Number(event.target.value))} />
            {error && <p className="form-error">{error}</p>}
            <div className="total-line"><span>Estimated total</span><strong>${(trip.price * guests).toLocaleString()}</strong></div>
            <Button type="submit" className="button-full">Reserve this trip <Icon name="arrow" /></Button>
          </form>
          <small>No payment is taken in this demo. Your reservation begins as pending.</small>
        </aside>
      </section>
    </>
  );
}
