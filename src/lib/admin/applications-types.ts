export type ApplicationListItem = {
  id: string; offeringId: string; createdAt: string; status: "received" | "reviewed";
  courseTitle: string; startDate: string | null; maskedName: string; contactLast4: string;
  lastChangeAt: string | null; lastActorId: string | null;
};
export type ApplicationCursor = { at: string; id: string };
export type ApplicationPage = { items: ApplicationListItem[]; next: ApplicationCursor | null };
export type ApplicationActionResult<T> = { ok: true; value: T } | { ok: false; reason: "denied" | "invalid" | "unavailable" | "conflict" };
export type ReviewedApplication = { changedAt: string; actorId: string };
