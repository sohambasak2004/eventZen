import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <span className="landing-footer-logo">EventZen</span>
          <p className="landing-footer-text">
            Simple tools for planning events, managing attendees, and keeping
            every detail organized in one place.
          </p>
        </div>

        <nav className="landing-footer-links" aria-label="Footer">
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms-and-conditions">Terms and Conditions</Link>
        </nav>
      </div>

      <p className="landing-footer-copy">
        Copyright 2026 EventZen. Built for smooth event planning.
      </p>
    </footer>
  );
}

export default Footer;
