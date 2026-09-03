import { Navigate, Outlet } from "react-router";
import { useValidatedUser } from "@/hooks/useValidatedUser";

const AdminGuard = () => {
  const { user, isValidated } = useValidatedUser();

  if (user?.user_role === "admin") {
    return <Outlet />;
  }
  if (!isValidated) {
    // Don't bounce a legitimate admin just because the persisted store
    // hasn't been confirmed against /users/me yet.
    return null;
  }
  return <Navigate to="/auth/login" replace />;
};

export default AdminGuard;
