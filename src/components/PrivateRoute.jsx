import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center p-10">Duke u ngarkuar...</div>;
  }

  if (!user) {
    // Nuk është loguar fare
    return <Navigate to="/" />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Loguar, por s’ka rolin e duhur
    return (
      <div className="p-4 text-red-600 text-center">
        ❌ Nuk ke akses në këtë faqe.
      </div>
    );
  }

  // Në rregull: lejo aksesin
  return <Outlet />;
}
