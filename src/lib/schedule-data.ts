import "server-only";

import { connection } from "next/server";
import { sampleOfferings } from "@/data/mock/courses";
import { CourseDataUnavailable, createPublishedDataClient, getCourseSource } from "@/lib/courses";
import { canDemoApply } from "@/lib/offerings";
import type { ScheduleOffering, ScheduleStatus } from "@/lib/schedule-types";

const statuses: Record<string, ScheduleStatus> = {
  scheduled: "예정", open: "모집중", closed: "마감", finished: "종료", cancelled: "취소",
};

function nullableDate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CourseDataUnavailable();
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new CourseDataUnavailable();
  return value;
}

function toOffering(value: unknown): ScheduleOffering {
  if (!value || typeof value !== "object") throw new CourseDataUnavailable();
  const row = value as Record<string, unknown>;
  for (const field of ["id", "course_id", "course_slug", "course_title", "status"]) {
    if (typeof row[field] !== "string" || !(row[field] as string).trim()) throw new CourseDataUnavailable();
  }
  const slug = row.course_slug as string;
  const status = statuses[row.status as string];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || typeof status !== "string" || !Number.isInteger(row.capacity) || (row.capacity as number) < 0 ||
      !(row.location === null || typeof row.location === "string")) throw new CourseDataUnavailable();
  const startDate = nullableDate(row.start_date);
  const endDate = nullableDate(row.end_date);
  if (startDate && endDate && endDate < startDate) throw new CourseDataUnavailable();
  return { id: row.id as string, course: { id: row.course_id as string, slug, title: row.course_title as string },
    startDate, endDate, location: typeof row.location === "string" && row.location.trim() ? row.location : null,
    capacity: row.capacity as number, enrolledCount: null, status, demoApply: false };
}

export async function listSchedule(): Promise<{ offerings: ScheduleOffering[]; example: boolean; source: "mock" | "supabase" }> {
  const source = getCourseSource();
  if (source === "mock") {
    return { source, example: true, offerings: sampleOfferings.map((item) => ({
      ...item, demoApply: canDemoApply(item),
    })) };
  }
  await connection();
  const { data, error } = await createPublishedDataClient().from("published_offerings")
    .select("id, course_id, course_slug, course_title, start_date, end_date, location, capacity, status")
    .order("start_date", { ascending: true, nullsFirst: false }).order("id");
  if (error || !Array.isArray(data)) throw new CourseDataUnavailable();
  return { source, example: process.env.ACADEMY_SCHEDULE_DEMO_DATA !== "false", offerings: data.map(toOffering) };
}
