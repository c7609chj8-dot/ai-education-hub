import { NextResponse } from "next/server";
import { isPublicFrontendOnlyRelease } from "./lib/release-mode";

/**
 * The pre-release deliberately has no public admin, diagnostics, or API surface.
 * This runs before an app route is rendered, so a hidden navigation item cannot
 * be used to reach the legacy admin demo or a future route handler by URL.
 */
export function proxy() {
  if (isPublicFrontendOnlyRelease()) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
