import "server-only";

type Stage = "auth_client" | "auth_user" | "admin_check" | "offering_catalog";
export type FailureKind = "auth" | "timeout" | "rate_limit" | "upstream_server" |
  "network_or_client" | "malformed_json" | "invalid_response" | "unknown";

// Output only fixed labels. Never log raw errors, bodies, URLs, headers or IDs.
export function classifyFailure(error: unknown, status?: number): FailureKind {
  let name = "";
  try {
    if (error && typeof error === "object" && "name" in error &&
        typeof error.name === "string") name = error.name;
  } catch { return "unknown"; }
  if (name === "SyntaxError") return "malformed_json";
  if (name === "AbortError" || name === "TimeoutError" || status === 408 || status === 504) return "timeout";
  if (status === 401 || status === 403 || name === "AuthSessionMissingError") return "auth";
  if (status === 429) return "rate_limit";
  if (status !== undefined && status >= 500 && status <= 599) return "upstream_server";
  if (status !== undefined && status >= 200 && status <= 299) return "invalid_response";
  if (status === 0 || name === "TypeError" || name === "AuthRetryableFetchError") return "network_or_client";
  return "unknown";
}

export function reportAdminFailure(stage: Stage, kind: FailureKind): void {
  console.warn("admin_diagnostic", { stage, kind });
}
