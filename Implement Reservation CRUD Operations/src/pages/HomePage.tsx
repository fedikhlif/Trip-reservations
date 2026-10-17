import { trips } from "../data/mockData";
import TripCard from "../components/TripCard";
import { Button, ButtonLink, Icon } from "../components/ui";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="container hero-content">
          <p className="eyebrow light">Curated escapes, beautifully planned</p>
          <h1>Go where life<br />feels <em>different.</em></h1>
          <p className="hero-copy">Small-group journeys designed to move you — without the hours of planning.</p>
          <form className="search-panel" onSubmit={(event) => event.preventDefault()}>
            <label><span>Where to?</span><span className="search-value"><Icon name="location" size={18} /><input aria-label="Destination" placeholder="Search destinations" /></span></label>
            <label><span>When?</span><span className="search-value"><Icon name="calendar" size={18} /><input aria-label="Travel dates" placeholder="Choose dates" /></span></label>
            <label><span>Travelers</span><span className="search-value"><Icon name="users" size={18} /><input aria-label="Travelers" defaultValue="2 travelers" /></span></label>
            <Button type="button" onClick={() => window.location.assign("/trips")}><Icon name="search" size={18} /> Find my trip</Button>
          </form>
          <div className="hero-proof"><span className="avatar-stack"><i>MB</i><i>AR</i><i>JL</i></span><span><strong>4.9/5</strong> from 2,000+ travelers</span></div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><p className="eyebrow">Leave ordinary behind</p><h2>Journeys worth taking</h2></div>
          <ButtonLink to="/trips" variant="secondary">Explore all trips <Icon name="arrow" size={18} /></ButtonLink>
        </div>
        <div className="trip-grid">{trips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} />)}</div>
      </section>

      <section className="why-section">
        <div className="container why-grid">
          <div>
            <p className="eyebrow light">Travel better</p>
            <h2>Every detail handled.<br /><em>Every moment yours.</em></h2>
          </div>
          <div className="feature-list">
            <article><span>01</span><div><h3>Places with a point of view</h3><p>Distinctive stays, meaningful local encounters, and routes you won't find everywhere.</p></div></article>
            <article><span>02</span><div><h3>Small groups, big connection</h3><p>No crowds. Just space to connect with a place and the people sharing it with you.</p></div></article>
            <article><span>03</span><div><h3>Support from start to finish</h3><p>Real people are here before, during, and after your trip whenever you need us.</p></div></article>
          </div>
        </div>
      </section>
    </>
  );
}
