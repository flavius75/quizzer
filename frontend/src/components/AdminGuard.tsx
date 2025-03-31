import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/store/authStore";


const AdminGuard = () => {
  const { user } = useAuthStore();

  return user?.user_role == "admin" ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default AdminGuard;

