import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/store/authStore";

const UserGuard = () => {
  const { user } = useAuthStore();

  return user ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default UserGuard;



