import "server-only";

import { getVerifiedUser } from "@/lib/supabase/verified-user";

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Missing or malformed configuration fails closed; IDs are never taken from user metadata.
function allowedAdminIds(): Set<string> {
  const raw = process.env.ACADEMY_ADMIN_USER_IDS;
  if (!raw?.trim()) return new Set();
  const ids = raw.split(",").map((id) => id.trim());
  if (ids.some((id) => !USER_ID.test(id))) return new Set();
  return new Set(ids.map((id) => id.toLowerCase()));
}

export async function getAdminAccess(): Promise<"unauthenticated" | "forbidden" | "allowed"> {
  const user = await getVerifiedUser();
  if (!user) return "unauthenticated";
  return allowedAdminIds().has(user.id.toLowerCase()) ? "allowed" : "forbidden";
}
