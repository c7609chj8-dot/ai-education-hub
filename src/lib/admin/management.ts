import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { getAdminAccess } from "./access";
import type { AdminCatalog, CourseInput, CourseState, ManagedCourse, ManagedOffering, OfferingInput, OfferingState } from "./management-types";

// Secret client creation is gated here too, so every data access rechecks the user.
async function authorizedClient() {
  if (await getAdminAccess() !== "allowed") return null;
  const config = getSupabaseAuthConfig();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (process.env.ACADEMY_ADMIN_MANAGEMENT_ENABLED !== "true" || !config || !key?.startsWith("sb_secret_")) return null;
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

function course(value: unknown): ManagedCourse | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  for (const key of ["id", "slug", "title", "category", "summary", "audience", "result_artifact", "publication_state"]) {
    if (typeof row[key] !== "string" || !(row[key] as string).trim()) return null;
  }
  if (!["draft", "published", "archived"].includes(row.publication_state as string) ||
      !Array.isArray(row.objectives) || !row.objectives.every((x: unknown) => typeof x === "string") ||
      !(row.duration_hours === null || (Number.isInteger(row.duration_hours) && (row.duration_hours as number) > 0))) return null;
  return { id: row.id as string, slug: row.slug as string, title: row.title as string, category: row.category as string,
    summary: row.summary as string, audience: row.audience as string, resultArtifact: row.result_artifact as string,
    durationHours: row.duration_hours as number | null, objectives: row.objectives as string[], publicationState: row.publication_state as CourseState };
}

function offering(value: unknown): ManagedOffering | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.course_id !== "string" ||
      !(row.start_date === null || typeof row.start_date === "string") || !(row.end_date === null || typeof row.end_date === "string") ||
      !(row.location === null || typeof row.location === "string") || !Number.isInteger(row.capacity) || (row.capacity as number) < 0 ||
      typeof row.status !== "string" || !["draft", "scheduled", "open", "closed", "finished", "cancelled"].includes(row.status) ||
      typeof row.is_public !== "boolean") return null;
  return { id: row.id, courseId: row.course_id, startDate: row.start_date as string | null, endDate: row.end_date as string | null,
    location: row.location as string | null, capacity: row.capacity as number, status: row.status as OfferingState, isPublic: row.is_public };
}

export async function loadAdminCatalog(): Promise<AdminCatalog | null> {
  try {
    const supabase = await authorizedClient();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("academy_admin_catalog");
    if (error || !data || typeof data !== "object" || !Array.isArray(data.courses) || !Array.isArray(data.offerings)) return null;
    const courses = data.courses.map(course);
    const offerings = data.offerings.map(offering);
    if (courses.some((item: ManagedCourse | null) => !item) || offerings.some((item: ManagedOffering | null) => !item)) return null;
    return { courses: courses as ManagedCourse[], offerings: offerings as ManagedOffering[] };
  } catch { return null; }
}

export async function saveCourse(input: CourseInput): Promise<boolean> {
  try {
    const supabase = await authorizedClient();
    if (!supabase) return false;
    const { error } = await supabase.rpc("academy_admin_save_course", { p_id: input.id, p_slug: input.slug, p_title: input.title,
      p_category: input.category, p_summary: input.summary, p_audience: input.audience, p_result_artifact: input.resultArtifact,
      p_duration_hours: input.durationHours, p_objectives: input.objectives, p_publication_state: input.publicationState });
    return !error;
  } catch { return false; }
}

export async function saveOffering(input: OfferingInput): Promise<boolean> {
  try {
    const supabase = await authorizedClient();
    if (!supabase) return false;
    const { error } = await supabase.rpc("academy_admin_save_offering", { p_id: input.id, p_course_id: input.courseId,
      p_start_date: input.startDate, p_end_date: input.endDate, p_location: input.location, p_capacity: input.capacity,
      p_status: input.status, p_is_public: input.isPublic });
    return !error;
  } catch { return false; }
}
