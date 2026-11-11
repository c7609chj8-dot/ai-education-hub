// Never include the submitted personal data, a database ID, or a secret in this result.
export type SubmissionResult = { status: "accepted" | "invalid" | "unavailable" | "unknown" };
