import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAuthConfig } from "./config";

export async function createAuthClient(writable = false) {
  const config = getSupabaseAuthConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        const save = () => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        if (writable) {
          save();
        } else {
          // Server Components cannot write cookies; the proxy refreshes them.
          try { save(); } catch { /* Proxy is responsible for refresh cookies. */ }
        }
      },
    },
  });
}
