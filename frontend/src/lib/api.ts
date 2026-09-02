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

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const SAFE_METHODS = new Set(["get", "head", "options"]);

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Mirrors the backend's CSRF check (see app/main.py): the session cookie is
// httpOnly, but the CSRF cookie deliberately isn't, so it can be read here
// and echoed back in a header a cross-site page couldn't set itself.
api.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // The session is already dead server-side (that's what a 401 means) -
      // clear local state only, don't call /auth/logout again.
      useAuthStore.getState().clearLocal();
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
