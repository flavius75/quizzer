import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { UserRead } from "@/types";

/**
 * The auth store's `user` is persisted to localStorage purely as a UX
 * convenience (see authStore.ts) - it can be stale if the role changed or
 * the httpOnly session cookie expired elsewhere. This re-validates it
 * against the server on every mount (guards remount on each navigation into
 * a protected subtree) and syncs the store to whatever the cookie actually
 * grants, so a route guard never trusts localStorage alone.
 */
export function useValidatedUser() {
  const { user, login, clearLocal } = useAuthStore();
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<UserRead>("/users/me")
      .then((res) => {
        if (cancelled) return;
        login({
          username: res.data.username,
          user_role: res.data.role as "player" | "creator" | "admin",
          score: res.data.global_score,
        });
      })
      .catch(() => {
        if (!cancelled) clearLocal();
      })
      .finally(() => {
        if (!cancelled) setIsValidated(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, isValidated };
}
