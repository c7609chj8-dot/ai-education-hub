export type CourseState = "draft" | "published" | "archived";
export type OfferingState = "draft" | "scheduled" | "open" | "closed" | "finished" | "cancelled";

export type ManagedCourse = {
  id: string; slug: string; title: string; category: string; summary: string;
  audience: string; resultArtifact: string; durationHours: number | null;
  objectives: string[]; publicationState: CourseState;
};
export type ManagedOffering = {
  id: string; courseId: string; startDate: string | null; endDate: string | null;
  location: string | null; capacity: number; status: OfferingState; isPublic: boolean;
};
export type CourseInput = Omit<ManagedCourse, "id"> & { id: string | null };
export type OfferingInput = Omit<ManagedOffering, "id"> & { id: string | null };
export type AdminCatalog = { courses: ManagedCourse[]; offerings: ManagedOffering[] };
export type FormResult<T> = { ok: true; value: T } | { ok: false; error: string };
