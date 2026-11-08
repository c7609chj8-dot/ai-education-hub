import "server-only";

import { createAuthClient } from "@/lib/supabase/server";

export type AdminIdentity = { access: "allowed"; userId: string } | { access: "unauthenticated" | "forbidden" };

// The verified user and the DB's current admin membership are both required.
// An unavailable RPC never falls back to a local environment ID.
export async function getAdminIdentity(): Promise<AdminIdentity> {
  let client;
  try { client = await createAuthClient(); } catch { return { access: "unauthenticated" }; }
  if (!client) return { access: "unauthenticated" };
  let user;
  try {
    const result = await client.auth.getUser();
    if (result.error || !result.data.user) return { access: "unauthenticated" };
    user = result.data.user;
  } catch { return { access: "unauthenticated" }; }
  try {
    const result = await client.rpc("academy_is_admin_v2");
    if (result.error || result.data !== true) return { access: "forbidden" };
    return { access: "allowed", userId: user.id.toLowerCase() };
  } catch { return { access: "forbidden" }; }
}

export async function getAdminAccess(): Promise<"unauthenticated" | "forbidden" | "allowed"> {
  return (await getAdminIdentity()).access;
}
