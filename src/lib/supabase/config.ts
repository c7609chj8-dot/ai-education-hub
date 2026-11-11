// Development credentials must never be sent to another project or an arbitrary URL.
// Production authentication requires a separately reviewed environment design.
const DEV_ORIGIN = "https://uenvjqgylrevujdjpfed.supabase.co";

export function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey?.startsWith("sb_publishable_")) return null;

  try {
    const parsed = new URL(url);
    if (parsed.origin !== DEV_ORIGIN || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
    return { url, publishableKey };
  } catch {
    return null;
  }
}
