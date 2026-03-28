import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasRole } from "../../utils/roles";

function Sidebar() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const isCustomer = hasRole(user, "customer");
  const linkClass = ({ isActive }) =>
    `side-link ${isActive ? "side-link-active" : ""}`;

  return (
    <aside className="sidebar-panel">
      <p className="sidebar-title">EventZen Workspace</p>
      <nav className="sidebar-nav">
        <NavLink className={linkClass} to="/event-listing">
          Discover Events
        </NavLink>

        {isCustomer && (
          <NavLink className={linkClass} to="/venues">
            Venues
          </NavLink>
        )}

        {isCustomer && (
          <NavLink className={linkClass} to="/vendors">
            Vendors
          </NavLink>
        )}

        {!isAdmin && (
          <NavLink className={linkClass} to="/events/new">
            Create My Event
          </NavLink>
        )}

        {!isAdmin && (
          <NavLink className={linkClass} to="/my-events">
            My Events
          </NavLink>
        )}

        {isAdmin && (
          <NavLink className={linkClass} to="/dashboard">
            Admin Dashboard
          </NavLink>
        )}

        {!isAdmin && (
          <NavLink className={linkClass} to="/my-bookings">
            My Bookings
          </NavLink>
        )}

        <NavLink className={linkClass} to="/profile">
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
