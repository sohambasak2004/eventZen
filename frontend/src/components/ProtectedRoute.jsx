import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/roles";

function ProtectedRoute({ children, requiredRole, requiredRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);

  if (isLoading) {
    return (
      <div className="page-loader">
        <div className="loader-orb" />
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.some((role) => hasRole(user, role))) {
    return <Navigate to="/event-listing" replace />;
  }

  return children;
}

export default ProtectedRoute;
