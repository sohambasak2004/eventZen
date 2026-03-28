import { Link } from "react-router-dom";
import Footer from "../components/layout/Footer";
import { useAuth } from "../context/AuthContext";

function Privacy() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-shell">
      <nav className="top-nav landing-nav">
        <div className="brand-group">
          <Link className="brand-mark" to="/">
            EventZen
          </Link>
          <span className="brand-tag">Privacy</span>
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
          <p className="eyebrow">Privacy</p>
          <h1>Privacy Policy</h1>
          <p className="info-page-intro">
            EventZen collects only the information needed to manage accounts,
            bookings, event details, and platform operations.
          </p>

          <div className="info-page-stack">
            <article className="info-page-panel">
              <h3>Information We Use</h3>
              <p>
                We use account, booking, and event information to operate the
                platform, improve reliability, and support users.
              </p>
            </article>
            <article className="info-page-panel">
              <h3>How We Protect Data</h3>
              <p>
                We apply access controls and service-level safeguards to help
                protect stored user and event information.
              </p>
            </article>
            <article className="info-page-panel">
              <h3>Third-Party Services</h3>
              <p>
                Some platform features may rely on connected services for payments,
                authentication, or infrastructure support.
              </p>
            </article>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default Privacy;
