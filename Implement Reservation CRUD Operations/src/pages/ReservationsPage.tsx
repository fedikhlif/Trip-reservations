import { useState } from "react";
import { useReservations } from "../app/ReservationContext";
import { trips } from "../data/mockData";
import type { ReservationStatus } from "../types";
import { Badge, Button, ButtonLink, Icon, SelectField } from "../components/ui";

export default function ReservationsPage() {
  const { reservations, updateStatus } = useReservations();
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");
  const visible = reservations.filter((item) => filter === "All" || item.status === filter);

  function cancel(id: string) {
    updateStatus(id, "Cancelled");
    setMessage(`${id} was cancelled. Any eligible refund will be reviewed.`);
  }

  function changeStatus(id: string, status: ReservationStatus) {
    updateStatus(id, status);
    setMessage(`${id} is now ${status.toLowerCase()}.`);
  }

  return (
    <section className="page-section container narrow-page">
      <div className="section-heading align-end">
        <div><p className="eyebrow">Your journeys</p><h1>My reservations</h1><p>View trip details, payment progress, and booking status.</p></div>
        <ButtonLink to="/trips">Plan another trip</ButtonLink>
      </div>
      <div className="list-toolbar">
        <SelectField label="Show reservations" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option>All</option><option>Confirmed</option><option>Pending</option><option>Cancelled</option>
        </SelectField>
      </div>
      {message && <div className="notice notice-success">{message}<button onClick={() => setMessage("")}>Dismiss</button></div>}
      <div className="reservation-list">
        {visible.map((reservation) => {
          const trip = trips.find((item) => item.id === reservation.tripId)!;
          return (
            <article className="reservation-row" key={reservation.id}>
              <img src={trip.image} alt="" />
              <div className="reservation-main">
                <div className="reservation-heading"><div><span>{reservation.id}</span><h2>{trip.title}</h2></div><Badge tone={reservation.status}>{reservation.status}</Badge></div>
                <div className="reservation-facts"><span><Icon name="calendar" size={17} />{trip.startDate}</span><span><Icon name="users" size={17} />{reservation.guests} travelers</span><span>${reservation.total.toLocaleString()}</span></div>
                <div className="reservation-actions">
                  <ButtonLink to={`/trips/${trip.id}`} variant="secondary">View trip</ButtonLink>
                  <ButtonLink to={`/payment/${reservation.id}`} variant="ghost">Payment: {reservation.paymentStatus}</ButtonLink>
                  {reservation.status === "Pending" && <Button variant="ghost" onClick={() => changeStatus(reservation.id, "Confirmed")}>Confirm demo</Button>}
                  {reservation.status !== "Cancelled" && <Button variant="danger" onClick={() => cancel(reservation.id)}>Cancel</Button>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
