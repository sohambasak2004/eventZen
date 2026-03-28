import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import PasswordField from "../../components/PasswordField";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Name, email, and password are required.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password should be at least 6 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      setSuccess(
        response.message ||
          "Registration successful! Please login to continue.",
      );

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message || "Unable to register right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-page">
        <div className="auth-card">
          <h3>Create Account</h3>
          <p>Start managing your events in a single shared workspace.</p>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Your full name"
              />
            </div>

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
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <PasswordField
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="form-control"
                placeholder="Repeat password"
              />
            </div>

            <button
              className="btn btn-success w-100"
              disabled={isSubmitting || success}
            >
              {isSubmitting
                ? "Creating account..."
                : success
                  ? "Registration successful!"
                  : "Register"}
            </button>
          </form>

          <p className="switch-auth-copy">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Register;
