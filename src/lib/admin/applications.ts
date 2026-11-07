import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { getAdminIdentity } from "./access";
import type { ApplicationActionResult, ApplicationListItem, ApplicationPage, ReviewedApplication } from "./applications-types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const moment = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const single = (form: FormData, key: string): string | null => {
  const values = form.getAll(key);
  return values.length === 1 && typeof values[0] === "string" ? values[0] : null;
};

async function adminClient() {
  const identity = await getAdminIdentity();
  if (identity.access !== "allowed") return null;
  const config = getSupabaseAuthConfig();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (process.env.ACADEMY_ADMIN_APPLICATIONS_ENABLED !== "true" || !config || !key?.startsWith("sb_secret_")) return null;
  // This development feature is pinned to the expressly approved dev project.
  const url = new URL(config.url);
  if (url.origin !== "https://uenvjqgylrevujdjpfed.supabase.co" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) return null;
  const client = createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return { client, actorId: identity.userId };
}

function parseItem(value: unknown): ApplicationListItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !uuid.test(row.id) || typeof row.offering_id !== "string" || !uuid.test(row.offering_id) ||
      !moment(row.created_at) || (row.status !== "received" && row.status !== "reviewed") ||
      typeof row.course_title !== "string" || !row.course_title.trim() || row.course_title.length > 300 ||
      !(row.start_date === null || (typeof row.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.start_date))) ||
      typeof row.masked_name !== "string" || !/^(?:\*|[^*]\*{1,2})$/u.test(row.masked_name) ||
      typeof row.contact_last4 !== "string" || !/^\d{4}$/.test(row.contact_last4) ||
      !((row.last_change_at === null && row.last_actor_id === null) ||
        (moment(row.last_change_at) && typeof row.last_actor_id === "string" && uuid.test(row.last_actor_id)))) return null;
  return { id: row.id, offeringId: row.offering_id, createdAt: row.created_at, status: row.status,
    courseTitle: row.course_title, startDate: row.start_date as string | null, maskedName: row.masked_name,
    contactLast4: row.contact_last4, lastChangeAt: row.last_change_at as string | null, lastActorId: row.last_actor_id as string | null };
}

export async function searchAdminApplications(form: FormData): Promise<ApplicationActionResult<ApplicationPage>> {
  try {
    const admin = await adminClient();
    if (!admin) return { ok: false, reason: "denied" };
    const search = single(form, "search"), at = single(form, "before_at"), id = single(form, "before_id");
    if (search === null || at === null || id === null || Array.from(search).length > 100 || /[\p{Cc}\p{Cf}]/u.test(search) ||
        !((at === "" && id === "") || (moment(at) && uuid.test(id)))) return { ok: false, reason: "invalid" };
    const { data, error } = await admin.client.rpc("academy_admin_search_applications", {
      p_search: search.trim(), p_before_at: at || null, p_before_id: id || null, p_limit: 21,
    });
    if (error || !data || typeof data !== "object" || !Array.isArray(data.items) || data.items.length > 21) return { ok: false, reason: "unavailable" };
    const items = data.items.map(parseItem) as (ApplicationListItem | null)[];
    if (items.some((item) => !item)) return { ok: false, reason: "unavailable" };
    const shown = (items as ApplicationListItem[]).slice(0, 20);
    const last = shown.at(-1);
    return { ok: true, value: { items: shown, next: items.length > 20 && last ? { at: last.createdAt, id: last.id } : null } };
  } catch { return { ok: false, reason: "unavailable" }; }
}

export async function reviewAdminApplication(form: FormData): Promise<ApplicationActionResult<ReviewedApplication>> {
  try {
    const admin = await adminClient();
    if (!admin) return { ok: false, reason: "denied" };
    const id = single(form, "id");
    if (!id || !uuid.test(id)) return { ok: false, reason: "invalid" };
    const { data, error } = await admin.client.rpc("academy_admin_review_application", { p_id: id, p_actor_id: admin.actorId });
    if (error || !data || typeof data !== "object") return { ok: false, reason: "unavailable" };
    if (data.result === "conflict") return { ok: false, reason: "conflict" };
    if (data.result !== "reviewed" || !moment(data.changed_at) || data.actor_id !== admin.actorId) return { ok: false, reason: "unavailable" };
    return { ok: true, value: { changedAt: data.changed_at, actorId: data.actor_id } };
  } catch { return { ok: false, reason: "unavailable" }; }
}
