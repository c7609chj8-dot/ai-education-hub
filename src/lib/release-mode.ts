/**
 * Public pre-release is the safe default. A future backend release must opt in
 * explicitly through a server-only environment variable after its own review.
 */
export function isPublicFrontendOnlyRelease() {
  return process.env.ACADEMY_PUBLIC_RELEASE_MODE !== "backend";
}
