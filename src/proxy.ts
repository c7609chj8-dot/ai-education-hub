import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = getSupabaseAuthConfig();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!config) return response;

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });

  // Refresh cookies here; authorization is checked again by the server page.
  try { await supabase.auth.getClaims(); } catch { /* The server page fails closed. */ }
  return response;
}

export const config = { matcher: ["/admin/login", "/admin/session"] };
