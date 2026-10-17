import { useMemo, useState } from "react";
import TripCard from "../components/TripCard";
import { trips } from "../data/mockData";
import { Field, SelectField } from "../components/ui";

export default function TripsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = useMemo(
    () =>
      trips.filter(
        (trip) =>
          (category === "All" || trip.category === category) &&
          `${trip.title} ${trip.location} ${trip.country}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, category],
  );

  return (
    <section className="page-section container">
      <div className="page-intro"><p className="eyebrow">Find your next story</p><h1>Explore our trips</h1><p>Thoughtfully paced journeys, handpicked stays, and just enough adventure.</p></div>
      <div className="filter-bar">
        <Field label="Search destinations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Italy, mountains, coast..." />
        <SelectField label="Travel style" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>All</option><option>Coast</option><option>Mountains</option><option>Culture</option>
        </SelectField>
        <div className="results-count"><strong>{filtered.length}</strong><span>trips found</span></div>
      </div>
      <div className="trip-grid">{filtered.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div>
      {!filtered.length && <div className="empty-state"><h2>No journeys found</h2><p>Try a broader destination or travel style.</p></div>}
    </section>
  );
}
