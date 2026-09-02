import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const API_BASE = import.meta.env.VITE_APP_URL ?? import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  // Fail loudly in dev instead of silently requesting "undefined/...".
  console.error("VITE_APP_URL (or VITE_API_BASE) is not set - API calls will fail.");
}

export const api = axios.create({
  baseURL: API_BASE,
  // The JWT lives in an httpOnly cookie set by the backend; the browser
  // attaches it automatically as long as every request opts in here.
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/auth/login") {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return error.response.data?.detail || error.response.data?.message || fallback;
    }
    if (error.request) {
      return "Unable to connect to server. Please check your connection.";
    }
  }
  return fallback;
}
