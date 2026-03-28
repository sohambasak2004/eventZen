import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasRole } from "../../utils/roles";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole(user, "admin");
  const homeRoute = isAdmin ? "/events" : "/event-listing";

  const handleLogout = async () => {
    navigate("/", { replace: true });
    await logout();
  };

  return (
    <nav className="top-nav">
      <div className="brand-group">
        <Link className="brand-mark" to={homeRoute}>
          EventZen
        </Link>
        <span className="brand-tag">Event Command Center</span>
      </div>

      <div className="top-nav-right">
        <Link to="/profile" className="welcome-chip">
          <span>{user?.name || "Planner"}</span>
          <small>{user?.email}</small>
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-outline-light"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
