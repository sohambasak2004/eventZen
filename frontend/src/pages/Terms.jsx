import { Link } from "react-router-dom";
import Footer from "../components/layout/Footer";
import { useAuth } from "../context/AuthContext";

function Terms() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-shell">
      <nav className="top-nav landing-nav">
        <div className="brand-group">
          <Link className="brand-mark" to="/">
            EventZen
          </Link>
          <span className="brand-tag">Terms and Conditions</span>
        </div>

        <div className="top-nav-right landing-nav-actions">
          <Link
            to={isAuthenticated ? "/event-listing" : "/"}
            className="btn btn-sm btn-outline-light"
          >
            Back
          </Link>
        </div>
      </nav>

      <div className="landing-page info-page-shell">
        <section className="info-page-card">
          <p className="eyebrow">Terms</p>
          <h1>Terms and Conditions</h1>
          <p className="info-page-intro">
            By using EventZen, you agree to use the platform responsibly and to
            provide accurate event and booking information.
          </p>

          <div className="info-page-stack">
            <article className="info-page-panel">
              <h3>Platform Usage</h3>
              <p>
                Users are responsible for activity under their accounts and for
                maintaining accurate event and contact details.
              </p>
            </article>
            <article className="info-page-panel">
              <h3>Bookings and Event Data</h3>
              <p>
                Booking availability, event schedules, and status information are
                subject to organizer updates and platform rules.
              </p>
            </article>
            <article className="info-page-panel">
              <h3>Service Availability</h3>
              <p>
                We aim to keep EventZen reliable, but features may change, pause,
                or be updated as the platform evolves.
              </p>
            </article>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default Terms;
