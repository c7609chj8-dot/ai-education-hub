import "server-only";

// This is pre-validation only. It must never be treated as a reservation or a committed application.
export type OfferingSnapshot = {
  id: string;
  isPublic: boolean;
  status: string;
  coursePublicationState: string;
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
};
export type ApplicationCandidate = { offeringId: string; name: string; contact: string; noticeVersion: string };
export type ApplicationValidation = { ok: true; candidate: ApplicationCandidate } | { ok: false; reason: "invalid" | "notice_unavailable" | "offering_unavailable" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notice = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const denied = (reason: "invalid" | "notice_unavailable" | "offering_unavailable"): ApplicationValidation => ({ ok: false, reason });

function field(form: FormData, key: string): string | null {
  const values = form.getAll(key);
  return values.length === 1 && typeof values[0] === "string" ? values[0] : null;
}

/** The snapshot and active notice version must come from trusted server-side sources, never the applicant. */
export function validateApplicationRequest(
  form: FormData,
  offering: OfferingSnapshot | null,
  activeNoticeVersion: string | null,
  now: Date,
): ApplicationValidation {
  if (!activeNoticeVersion || !notice.test(activeNoticeVersion)) return denied("notice_unavailable");
  const offeringId = field(form, "offering_id");
  const rawName = field(form, "name");
  const rawContact = field(form, "contact");
  const submittedNotice = field(form, "notice_version");
  const consent = field(form, "consent");
  const name = rawName?.trim();
  const contact = rawContact?.trim();
  if (!offeringId || !uuid.test(offeringId) || !name || Array.from(name).length > 100 || /[\p{Cc}\p{Cf}]/u.test(name) ||
      !contact || contact.length > 32 || !/^\+?[0-9 ()-]+$/.test(contact) ||
      contact.replace(/\D/g, "").length < 9 || contact.replace(/\D/g, "").length > 15 ||
      submittedNotice !== activeNoticeVersion || consent !== "on") return denied("invalid");

  // Until recruitment policy is approved, both boundaries are required and end is exclusive.
  if (!offering || offering.id.toLowerCase() !== offeringId.toLowerCase() || offering.isPublic !== true ||
      offering.status !== "open" || offering.coursePublicationState !== "published" ||
      !offering.enrollmentOpensAt || !offering.enrollmentClosesAt ||
      !timestamp.test(offering.enrollmentOpensAt) || !timestamp.test(offering.enrollmentClosesAt)) return denied("offering_unavailable");
  const start = Date.parse(offering.enrollmentOpensAt);
  const end = Date.parse(offering.enrollmentClosesAt);
  const time = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(time) || start >= end || time < start || time >= end) return denied("offering_unavailable");
  return { ok: true, candidate: { offeringId, name, contact, noticeVersion: activeNoticeVersion } };
}
