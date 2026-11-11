import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { connection } from "next/server";
import { courses as exampleCourses, type CoursePreview } from "@/data/mock/courses";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type CourseWeek = { weekNumber: number; title: string };
export type CourseDetail = CoursePreview & { objectives: string[]; weeks: CourseWeek[]; durationHours: number | null };
export type CourseSource = "mock" | "supabase";

export class CourseDataUnavailable extends Error {
  constructor() { super("Course data is unavailable"); }
}

export function getCourseSource(): CourseSource {
  const source = process.env.ACADEMY_COURSE_SOURCE || "mock";
  if (source !== "mock" && source !== "supabase") throw new CourseDataUnavailable();
  return source;
}

export function courseDataIsExample(source: CourseSource) {
  return source === "mock" || process.env.ACADEMY_COURSE_DEMO_DATA !== "false";
}

export function createPublishedDataClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new CourseDataUnavailable();
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

function preview(value: unknown): CoursePreview {
  if (!value || typeof value !== "object") throw new CourseDataUnavailable();
  const row = value as Record<string, unknown>;
  const required = ["id", "slug", "title", "category", "audience", "summary", "result_artifact"] as const;
  if (required.some((field) => typeof row[field] !== "string" || !(row[field] as string).trim())) throw new CourseDataUnavailable();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug as string)) throw new CourseDataUnavailable();
  return { id: row.id as string, slug: row.slug as string, title: row.title as string, category: row.category as string,
    audience: row.audience as string, summary: row.summary as string, resultArtifact: row.result_artifact as string };
}

export async function listCourses(): Promise<{ courses: CoursePreview[]; source: CourseSource; example: boolean }> {
  const source = getCourseSource();
  if (source === "mock") return { courses: exampleCourses, source, example: true };
  await connection();
  const { data, error } = await createPublishedDataClient().from("published_courses")
    .select("id, slug, title, category, audience, summary, result_artifact").order("title");
  if (error || !Array.isArray(data)) throw new CourseDataUnavailable();
  return { courses: data.map(preview), source, example: courseDataIsExample(source) };
}

export const findCourse = cache(async (slug: string): Promise<{ course: CourseDetail; source: CourseSource; example: boolean } | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const source = getCourseSource();
  if (source === "mock") {
    const course = exampleCourses.find((item) => item.slug === slug);
    return course ? { course: { ...course, weeks: course.weeks.map((title, index) => ({ weekNumber: index + 1, title })) }, source, example: true } : null;
  }
  const supabase = createPublishedDataClient();
  const { data, error } = await supabase.from("published_courses")
    .select("id, slug, title, category, audience, summary, result_artifact, duration_hours, objectives")
    .eq("slug", slug).maybeSingle();
  if (error) throw new CourseDataUnavailable();
  if (!data) return null;
  const basic = preview(data);
  if (!Array.isArray(data.objectives) || !data.objectives.every((item: unknown) => typeof item === "string") ||
      !(data.duration_hours === null || (Number.isInteger(data.duration_hours) && data.duration_hours > 0))) throw new CourseDataUnavailable();
  const weeksResult = await supabase.from("published_course_weeks").select("week_number, title")
    .eq("course_id", basic.id).order("week_number");
  if (weeksResult.error || !Array.isArray(weeksResult.data)) throw new CourseDataUnavailable();
  const weeks = weeksResult.data.map((week: { week_number: unknown; title: unknown }) => {
    if (!Number.isInteger(week.week_number) || (week.week_number as number) < 1 || typeof week.title !== "string" || !week.title.trim()) throw new CourseDataUnavailable();
    return { weekNumber: week.week_number as number, title: week.title };
  });
  return { course: { ...basic, objectives: data.objectives as string[], weeks, durationHours: data.duration_hours as number | null }, source, example: courseDataIsExample(source) };
});
