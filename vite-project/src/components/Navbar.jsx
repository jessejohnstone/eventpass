import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import {
  ArrowUpRight,
  Menu,
  Ticket,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, loading } = useAuth();

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="navbar container">
        <Link
          to="/"
          className="brand"
          onClick={closeMenu}
        >
          <span className="brand-icon">
            <Ticket size={23} />
          </span>

          <span>
            eventpass
            <span className="brand-dot">.</span>
          </span>
        </Link>

        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={
            menuOpen ? "Close navigation" : "Open navigation"
          }
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
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Discover events
          </NavLink>

          <Link
            to="/#how-it-works"
            onClick={closeMenu}
          >
            How it works
          </Link>

          {loading ? (
            <span role="status">Checking account…</span>
          ) : user ? (
            <Link
              to="/organizer"
              className="button button-dark button-small"
              onClick={closeMenu}
            >
              My dashboard
              <ArrowUpRight size={16} />
            </Link>
          ) : (
            <Link
              to="/organizer/login"
              className="button button-dark button-small"
              onClick={closeMenu}
            >
              Organizer Login
              <ArrowUpRight size={16} />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}