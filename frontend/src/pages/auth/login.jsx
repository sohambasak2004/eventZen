import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordField from "../../components/PasswordField";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-page">
        <div className="auth-card">
          <h3>Welcome Back</h3>
          <p>Login to manage your events, attendees, and budget insights.</p>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="form-control"
                placeholder="you@company.com"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <PasswordField
                name="password"
                value={form.password}
                onChange={handleChange}
                className="form-control"
                placeholder="Your password"
              />
            </div>

            <button className="btn btn-primary w-100" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="switch-auth-copy">
            New to EventZen? <Link to="/register">Create your account</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Login;
