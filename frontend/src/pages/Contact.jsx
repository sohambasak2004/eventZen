import { Link } from "react-router-dom";
import Footer from "../components/layout/Footer";
import { useAuth } from "../context/AuthContext";

function Contact() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-shell">
      <nav className="top-nav landing-nav">
        <div className="brand-group">
          <Link className="brand-mark" to="/">
            EventZen
          </Link>
          <span className="brand-tag">Contact & Support</span>
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
          <p className="eyebrow">Contact</p>
          <h1>Get in touch with EventZen</h1>
          <p className="info-page-intro">
            Reach out for support, account help, platform feedback, or partnership
            questions.
          </p>

          <div className="info-page-grid">
            <article className="info-page-panel">
              <h3>Email Support</h3>
              <p>support@eventzen.com</p>
            </article>
            <article className="info-page-panel">
              <h3>Phone</h3>
              <p>+91 90000 00000</p>
            </article>
            <article className="info-page-panel">
              <h3>Business Hours</h3>
              <p>Monday to Friday, 9:00 AM to 6:00 PM IST</p>
            </article>
            <article className="info-page-panel">
              <h3>Office</h3>
              <p>Kolkata, India</p>
            </article>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default Contact;
