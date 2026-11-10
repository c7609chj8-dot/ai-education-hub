import "server-only";

import { createAuthClient } from "@/lib/supabase/server";
import { classifyFailure, reportAdminFailure } from "./diagnostics";

export type AdminIdentity = { access: "allowed"; userId: string } | { access: "unauthenticated" | "forbidden" };

// The verified user and the DB's current admin membership are both required.
// An unavailable RPC never falls back to a local environment ID.
export async function getAdminIdentity(): Promise<AdminIdentity> {
  let client;
  try { client = await createAuthClient(); } catch (error) {
    reportAdminFailure("auth_client", classifyFailure(error));
    return { access: "unauthenticated" };
  }
  if (!client) return { access: "unauthenticated" };
  let user;
  try {
    const result = await client.auth.getUser();
    if (result.error) {
      reportAdminFailure("auth_user", classifyFailure(result.error, result.error.status));
      return { access: "unauthenticated" };
    }
    if (!result.data.user) return { access: "unauthenticated" };
    user = result.data.user;
  } catch (error) {
    reportAdminFailure("auth_user", classifyFailure(error));
    return { access: "unauthenticated" };
  }
  try {
    const result = await client.rpc("academy_is_admin_v2");
    if (result.error) {
      reportAdminFailure("admin_check", classifyFailure(result.error, result.status));
      return { access: "forbidden" };
    }
    if (result.data !== true) return { access: "forbidden" };
    return { access: "allowed", userId: user.id.toLowerCase() };
  } catch (error) {
    reportAdminFailure("admin_check", classifyFailure(error));
    return { access: "forbidden" };
  }
}

export async function getAdminAccess(): Promise<"unauthenticated" | "forbidden" | "allowed"> {
  return (await getAdminIdentity()).access;
}
