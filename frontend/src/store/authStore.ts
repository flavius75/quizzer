import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";
import { api } from "@/lib/api";


interface AuthState {
  user: User | null;
  login: (userData: User) => void;
  /** Clears local state only - does not touch the server-side cookie. Used
   * internally (e.g. by the 401 interceptor) where a session is already
   * known to be dead. UI code should call `logout()` instead. */
  clearLocal: () => void;
  /** The one logout path the UI should call: invalidates the httpOnly
   * cookie server-side, then clears local state - so every "log out"
   * button behaves the same instead of some only clearing local state. */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (userData) => set({ user: userData }),
      clearLocal: () => set({ user: null }),
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch (err) {
          console.error("Logout request failed (clearing local session anyway):", err);
        }
        set({ user: null });
      },
    }),
    {
      name: "auth-storage",
      // The session itself lives in the httpOnly `access_token` cookie
      // (invisible to JS, sent automatically by the browser). What's
      // persisted here is only display/routing info - username, role, score
      // - as a UX convenience so a page refresh doesn't flash a logged-out
      // state; it grants no access on its own. The backend re-validates the
      // cookie on every request and src/lib/api.ts logs out on any 401.
    }
  )
);