import { Link } from "react-router-dom";
import FrequentlyAskedQuestions from "../components/FrequentlyAskedQuestions";
import Footer from "../components/layout/Footer";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-shell">
      <nav className="top-nav landing-nav">
        <div className="brand-group">
          <Link className="brand-mark" to="/">
            EventZen
          </Link>
          <span className="brand-tag">Event Management System</span>
        </div>

        <div className="top-nav-right landing-nav-actions">
          {isAuthenticated ? (
            <Link to="/event-listing" className="btn btn-sm btn-light">
              Go to Events
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm btn-outline-light">
                Login
              </Link>
              <Link to="/register" className="btn btn-sm btn-light">
                Create Account
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="landing-page">
        <div className="landing-glow landing-glow-one" />
        <div className="landing-glow landing-glow-two" />

        <section className="landing-hero">
          <p className="eyebrow">Event Management System</p>
          <h1>Plan, track, and deliver events without spreadsheets.</h1>
          <p className="hero-copy">
            EventZen helps teams organize conferences, workshops, networking and
            many more type of events with one clean workflow for creation,
            attendance, and budget visibility.
          </p>
        </section>

        <section className="feature-grid">
          <article>
            <h3>Event Tracking</h3>
            <p>
              Create events with dates, locations, capacity, and status updates.
            </p>
          </article>
          <article>
            <h3>Live Dashboard</h3>
            <p>
              See budget totals, attendee volume, and upcoming timelines
              instantly.
            </p>
          </article>
          <article>
            <h3>Fast Operations</h3>
            <p>
              Edit or remove events quickly and keep records organized in one
              place.
            </p>
          </article>
        </section>

        <FrequentlyAskedQuestions />
      </div>
      <Footer />
    </div>
  );
}

export default Home;
