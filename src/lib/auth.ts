"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { api } from "../../convex/_generated/api";

const TOKEN_KEY = "pb_token";
const listeners = new Set<() => void>();

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  listeners.forEach((l) => l());
}

export function useToken(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    getToken,
    () => null
  );
}

export type Me = NonNullable<ReturnType<typeof useMe>["me"]>;

export function useMe() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  return {
    token,
    me: me ?? null,
    // loading: token present but query not yet resolved
    loading: !!token && me === undefined,
  };
}

/** Redirects to the auth screen when there is no valid session. */
export function useRequireAuth() {
  const { token, me, loading } = useMe();
  const router = useRouter();
  const signedOut = !token || (!loading && !me);
  useEffect(() => {
    if (signedOut) router.replace("/");
  }, [signedOut, router]);
  return { token, me, loading };
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(email: string, password: string) {
  return sha256Hex(`${email.trim().toLowerCase()}:${password}`);
}
