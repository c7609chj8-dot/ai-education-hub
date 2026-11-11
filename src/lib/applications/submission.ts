import "server-only";
import { validateApplicationInput } from "./validation";
import type { ApplicationCandidate } from "./validation";
import type { SubmissionResult } from "./submission-types";

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type SubmissionDependencies = {
  // This must be an approved server-side value, not a version supplied by the browser.
  activeNoticeVersion: string | null;
  // A future adapter must invoke the day-12 atomic transaction with server-only credentials.
  commit: (candidate: ApplicationCandidate, requestId: string) => Promise<unknown>;
};

// This function has no real adapter or public route. It does not itself reserve a place.
export async function submitApplication(form: FormData, deps: SubmissionDependencies): Promise<SubmissionResult> {
  const parsed = validateApplicationInput(form, deps.activeNoticeVersion);
  const ids = form.getAll("request_id");
  if (!parsed.ok || ids.length !== 1 || typeof ids[0] !== "string" || !requestIdPattern.test(ids[0])) return { status: "invalid" };
  try {
    // Do not reject from a stale offering snapshot: the transaction rechecks under lock
    // and can recover an earlier committed request after the offering closes.
    const result = await deps.commit(parsed.candidate, ids[0]);
    if (result === "accepted" || result === "unavailable") return { status: result };
    return { status: "unknown" };
  } catch {
    // The transaction may have committed before the connection failed. Never call this failure final.
    return { status: "unknown" };
  }
}
