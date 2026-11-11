import "server-only";

import { createAuthClient } from "./server";

// Always confirm identity with Supabase Auth; never trust cookie contents alone.
export async function getVerifiedUser() {
  const supabase = await createAuthClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
