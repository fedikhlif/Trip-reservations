import { useReservations } from "../app/ReservationContext";
import { trips } from "../data/mockData";
import TripCard from "../components/TripCard";
import { Badge, ButtonLink, Icon } from "../components/ui";

export default function DashboardPage() {
  const { reservations } = useReservations();
  const upcoming = reservations.find((item) => item.status === "Confirmed");
  const trip = trips.find((item) => item.id === upcoming?.tripId);
  return (
    <section className="page-section container dashboard">
      <div className="dashboard-welcome"><div><p className="eyebrow">Traveler dashboard</p><h1>Welcome back, Maya.</h1><p>Your next adventure is closer than you think.</p></div><div className="profile-chip"><span>MB</span><div><strong>Maya Bennett</strong><small>Explorer since 2023</small></div></div></div>
      <div className="stat-grid"><article><span>Upcoming trips</span><strong>{reservations.filter((item) => item.status === "Confirmed").length}</strong><Icon name="ticket" /></article><article><span>Countries visited</span><strong>8</strong><Icon name="compass" /></article><article><span>Travel credits</span><strong>$240</strong><Icon name="star" /></article></div>
      {upcoming && trip && <article className="next-trip"><img src={trip.image} alt="" /><div><div className="next-trip-top"><Badge tone="Confirmed">Coming up</Badge><span>{upcoming.id}</span></div><h2>{trip.title}</h2><p><Icon name="calendar" size={18} /> {trip.startDate} · {trip.duration} days</p><ButtonLink to="/reservations" variant="secondary">View reservation <Icon name="arrow" size={17} /></ButtonLink></div></article>}
      <div className="section-heading compact"><div><p className="eyebrow">Picked for you</p><h2>Keep exploring</h2></div></div>
      <div className="trip-grid">{trips.slice(3, 6).map((item) => <TripCard key={item.id} trip={item} />)}</div>
    </section>
  );
}
