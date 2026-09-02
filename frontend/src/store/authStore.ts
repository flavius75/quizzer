import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";


interface AuthState {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),
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