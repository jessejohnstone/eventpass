import { useEffect } from "react";

import {
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import EventDetails from "./pages/EventDetails";
import Login from "./pages/Login";
import OrganizerDashboard from "./pages/OrganizerDashboard";

function ScrollToLocation() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const frame = window.requestAnimationFrame(() => {
        const element = document.getElementById(
          hash.slice(1)
        );

        element?.scrollIntoView({
          behavior: "smooth",
        });
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [pathname, hash]);

  return null;
}

function NotFound() {
  return (
    <main className="container page-section">
      <div className="empty-state">
        <h1>That page wandered off.</h1>

        <p>Let’s find your next experience.</p>

        <Link
          to="/"
          className="button button-dark"
        >
          Back to events
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <ScrollToLocation />

      <Navbar />

      <div className="development-notice">
        Sample events · Booking and admission
        are not active yet.
      </div>

      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/events/:id"
          element={
            <EventDetails
              key={location.pathname}
            />
          }
        />

        <Route
          path="/organizer/login"
          element={<Login />}
        />

        <Route
          path="/organizer"
          element={
            <ProtectedRoute>
              <OrganizerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>

      <footer className="site-footer container">
        <Link
          to="/"
          className="footer-brand"
        >
          eventpass.
        </Link>

        <p>
          Good moments start with being there.
        </p>

        <span>Made for connection.</span>
      </footer>
    </>
  );
}