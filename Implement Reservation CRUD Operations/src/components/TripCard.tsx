import { Link } from "react-router";
import type { Trip } from "../types";
import { Badge, Icon } from "./ui";

export default function TripCard({ trip }: { trip: Trip }) {
  return (
    <article className="trip-card">
      <Link to={`/trips/${trip.id}`} className="trip-image-wrap">
        <img src={trip.image} alt={`${trip.location}, ${trip.country}`} className="trip-image" />
        <Badge tone="light">{trip.duration} days</Badge>
        <span className="favorite"><Icon name="heart" size={18} /></span>
      </Link>
      <div className="trip-card-body">
        <div className="trip-meta"><span><Icon name="location" size={15} />{trip.location}, {trip.country}</span><span className="rating"><Icon name="star" size={14} /> {trip.rating}</span></div>
        <Link to={`/trips/${trip.id}`} className="trip-title">{trip.title}</Link>
        <div className="trip-detail-row"><span><Icon name="calendar" size={16} />{trip.startDate}</span><span>{trip.seats} seats left</span></div>
        <div className="trip-card-footer"><span>From <strong>${trip.price.toLocaleString()}</strong></span><Link to={`/trips/${trip.id}`} aria-label={`View ${trip.title}`}><Icon name="arrow" /></Link></div>
      </div>
    </article>
  );
}
