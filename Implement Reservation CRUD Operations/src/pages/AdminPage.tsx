import { useState, type FormEvent } from "react";
import { useReservations } from "../app/ReservationContext";
import { trips } from "../data/mockData";
import { Badge, Button, Field, SelectField } from "../components/ui";

export default function AdminPage() {
  const { reservations } = useReservations();
  const [message, setMessage] = useState("");
  const [tripName, setTripName] = useState("");
  function addTrip(event: FormEvent) {
    event.preventDefault();
    if (!tripName.trim()) return setMessage("Enter a trip name before saving.");
    setMessage(`“${tripName}” is ready to send to the future trips API.`);
    setTripName("");
  }
  return (
    <section className="page-section container admin-page">
      <div className="page-intro"><p className="eyebrow">Operations</p><h1>Admin dashboard</h1><p>A clear view of inventory, bookings, and payments.</p></div>
      <div className="stat-grid admin-stats"><article><span>Total bookings</span><strong>{reservations.length}</strong><small>Across all departures</small></article><article><span>Gross booking value</span><strong>${reservations.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</strong><small>Mock data</small></article><article><span>Available seats</span><strong>{trips.reduce((sum, item) => sum + item.seats, 0)}</strong><small>Across {trips.length} trips</small></article></div>
      {message && <div className="notice notice-success">{message}<button onClick={() => setMessage("")}>Dismiss</button></div>}
      <div className="admin-grid">
        <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">Inventory</p><h2>Manage trips</h2></div></div>
          <div className="admin-trip-list">{trips.slice(0, 4).map((trip) => <div key={trip.id}><img src={trip.image} alt="" /><span><strong>{trip.title}</strong><small>{trip.startDate} · {trip.seats} seats</small></span><Button variant="ghost" onClick={() => setMessage(`${trip.title} opened for editing.`)}>Edit</Button></div>)}</div>
        </section>
        <aside className="admin-panel add-panel"><p className="eyebrow">Quick action</p><h2>Add a trip</h2><form onSubmit={addTrip}><Field label="Trip name" placeholder="e.g. Tuscan Harvest" value={tripName} onChange={(event) => setTripName(event.target.value)} /><SelectField label="Travel style" defaultValue="Culture"><option>Culture</option><option>Coast</option><option>Mountains</option></SelectField><Field label="Starting price" type="number" placeholder="2400" /><Button type="submit" className="button-full">Save draft trip</Button></form></aside>
      </div>
      <section className="admin-panel reservation-table-panel"><div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Reservations</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Reservation</th><th>Customer</th><th>Trip</th><th>Total</th><th>Status</th></tr></thead><tbody>{reservations.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.customerName}</td><td>{trips.find((trip) => trip.id === item.tripId)?.title}</td><td>${item.total.toLocaleString()}</td><td><Badge tone={item.status}>{item.status}</Badge></td></tr>)}</tbody></table></div>
      </section>
    </section>
  );
}
