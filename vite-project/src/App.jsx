import { useEffect } from "react";

import {
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Login from "./pages/Login.jsx";

import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import Tickets from "./pages/Tickets.jsx";

function ScrollToLocation() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Only treat known homepage sections as anchors.
    // Supabase and ticket links can also contain
    // URL fragments, which must remain untouched.
    const sectionIds = [
      "discover",
      "how-it-works",
      "organizers",
    ];

    const sectionId = hash.slice(1);

    if (
      pathname === "/" &&
      sectionIds.includes(sectionId)
    ) {
      const frame = window.requestAnimationFrame(() => {
        const element =
          document.getElementById(sectionId);

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
      left: 0,
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

        <p>
          The address may be incorrect,
          or this page may no longer exist.
        </p>

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
        Payment integration in testing.
        Use Paystack test mode during development.
      </div>

      <Routes>
        {/* Public homepage */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Published events and owner-only draft previews */}
        <Route
          path="/events/:id"
          element={
            <EventDetails
              key={location.pathname}
            />
          }
        />

        {/* Organizer registration and login */}
        <Route
          path="/organizer/login"
          element={<Login />}
        />

        {/* Protected organizer dashboard */}
        <Route
          path="/organizer"
          element={
            <ProtectedRoute>
              <OrganizerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Return from Paystack checkout */}
        <Route
          path="/checkout/return"
          element={
            <Tickets
              key={
                location.pathname +
                location.search +
                location.hash
              }
            />
          }
        />

        {/* Private ticket link */}
        <Route
          path="/tickets"
          element={
            <Tickets
              key={
                location.pathname +
                location.search +
                location.hash
              }
            />
          }
        />

        {/* Unknown addresses */}
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