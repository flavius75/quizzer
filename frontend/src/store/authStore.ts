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
    { name: "auth-storage" } // Stored in localStorage under this key
  )
);