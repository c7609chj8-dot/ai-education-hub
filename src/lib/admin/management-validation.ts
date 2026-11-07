import type { CourseInput, CourseState, FormResult, OfferingInput, OfferingState } from "./management-types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COURSE_STATES = ["draft", "published", "archived"] as const;
const OFFERING_STATES = ["draft", "scheduled", "open", "closed", "finished", "cancelled"] as const;
const invalid = { ok: false, error: "입력한 내용을 확인해 주세요." } as const;

function field(form: FormData, name: string): string | null {
  const values = form.getAll(name);
  return values.length === 1 && typeof values[0] === "string" ? values[0] : null;
}
function optionalId(value: string | null) {
  if (value === "") return null;
  return value && UUID.test(value) ? value : undefined;
}
function date(value: string | null): string | null | undefined {
  if (value === "") return null;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
}
function integer(value: string | null, minimum: number): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= 2147483647 ? parsed : undefined;
}

export function parseCourseForm(form: FormData): FormResult<CourseInput> {
  const id = optionalId(field(form, "id"));
  const slug = field(form, "slug")?.trim();
  const title = field(form, "title")?.trim();
  const category = field(form, "category")?.trim();
  const summary = field(form, "summary")?.trim();
  const audience = field(form, "audience")?.trim();
  const resultArtifact = field(form, "result_artifact")?.trim();
  const state = field(form, "publication_state");
  const rawHours = field(form, "duration_hours");
  const rawObjectives = field(form, "objectives");
  const durationHours = rawHours === "" ? null : integer(rawHours, 1);
  if (id === undefined || !slug || slug.length > 100 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
      !title || title.length > 200 || !category || category.length > 100 || !summary || summary.length > 4000 ||
      !audience || audience.length > 500 || !resultArtifact || resultArtifact.length > 500 ||
      !state || !COURSE_STATES.includes(state as CourseState) || durationHours === undefined ||
      rawObjectives === null || rawObjectives.length > 10000) return invalid;
  const objectives = rawObjectives.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (objectives.length > 30 || objectives.some((item) => item.length > 500)) return invalid;
  return { ok: true, value: { id, slug, title, category, summary, audience, resultArtifact, durationHours,
    objectives, publicationState: state as CourseState } };
}

export function parseOfferingForm(form: FormData): FormResult<OfferingInput> {
  const id = optionalId(field(form, "id"));
  const courseId = field(form, "course_id");
  const startDate = date(field(form, "start_date"));
  const endDate = date(field(form, "end_date"));
  const rawLocation = field(form, "location");
  const capacity = integer(field(form, "capacity"), 0);
  const status = field(form, "status");
  const visibility = form.getAll("is_public");
  if (id === undefined || !courseId || !UUID.test(courseId) || startDate === undefined || endDate === undefined ||
      (startDate && endDate && endDate < startDate) || rawLocation === null || rawLocation.trim().length > 500 ||
      capacity === undefined || !status || !OFFERING_STATES.includes(status as OfferingState) ||
      visibility.length > 1 || (visibility.length === 1 && visibility[0] !== "on")) return invalid;
  const isPublic = visibility.length === 1;
  if (isPublic && status === "draft") return { ok: false, error: "작성 중인 기수는 공개할 수 없습니다." };
  return { ok: true, value: { id, courseId, startDate, endDate, location: rawLocation.trim() || null,
    capacity, status: status as OfferingState, isPublic } };
}
