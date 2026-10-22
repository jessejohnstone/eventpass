import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, Ticket, X } from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="navbar container">
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-icon">
            <Ticket size={23} />
          </span>

          <span>
            eventpass<span className="brand-dot">.</span>
          </span>
        </Link>

        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav
          id="main-navigation"
          className={`nav-links ${menuOpen ? "is-open" : ""}`}
        >
          <NavLink
            to="/"
            end
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Discover events
          </NavLink>

          <Link
            to="/#how-it-works"
            onClick={() => {
              closeMenu();

              if (location.pathname === "/") {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            How it works
          </Link>

          <Link
            to="/#organizers"
            className="button button-dark button-small"
            onClick={() => {
              closeMenu();

              if (location.pathname === "/") {
                document
                  .getElementById("organizers")
                  ?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            For organizers
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}