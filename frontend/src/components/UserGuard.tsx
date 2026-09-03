import { Navigate, Outlet } from "react-router";
import { useValidatedUser } from "@/hooks/useValidatedUser";

const UserGuard = () => {
  const { user, isValidated } = useValidatedUser();

  if (user) {
    return <Outlet />;
  }
  if (!isValidated) {
    return null;
  }
  return <Navigate to="/auth/login" replace />;
};

export default UserGuard;
