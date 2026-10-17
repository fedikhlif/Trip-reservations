import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { ButtonLink, Icon } from "./ui";

const navigation = [
  { label: "Home", to: "/" },
  { label: "Explore trips", to: "/trips" },
  { label: "My reservations", to: "/reservations" },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container nav-wrap">
          <Link to="/" className="brand" aria-label="Roamly home">
            <span className="brand-mark"><Icon name="compass" size={23} /></span>
            <span>roamly</span>
          </Link>
          <nav className={menuOpen ? "main-nav nav-open" : "main-nav"} aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Admin</NavLink>
          </nav>
          <div className="nav-actions">
            <ButtonLink to="/dashboard" variant="ghost"><Icon name="user" size={18} /> Log in</ButtonLink>
          </div>
          <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">
            <Icon name="menu" />
          </button>
        </div>
      </header>
      <main><Outlet /></main>
      <footer>
        <div className="container footer-grid">
          <div>
            <Link to="/" className="brand brand-light"><span className="brand-mark"><Icon name="compass" size={22} /></span><span>roamly</span></Link>
            <p>Thoughtful journeys for curious people.</p>
          </div>
          <div><strong>Explore</strong><Link to="/trips">All trips</Link><Link to="/dashboard">Dashboard</Link></div>
          <div><strong>Support</strong><Link to="/reservations">My reservations</Link><a href="mailto:hello@roamly.travel">Contact us</a></div>
          <p className="footer-note">© 2025 Roamly Travel. Demo frontend.</p>
        </div>
      </footer>
    </div>
  );
}
