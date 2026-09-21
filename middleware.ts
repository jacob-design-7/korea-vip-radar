import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {"WWW-Authenticate": 'Basic realm="Korea VIP Radar"'}
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.RADAR_BASIC_USER;
  const pass = process.env.RADAR_BASIC_PASS;

  // Bootstrap mode: Vercel can deploy before secrets are configured.
  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();
  try {
    const decoded = atob(header.slice(6));
    const split = decoded.indexOf(":");
    if (split < 0) return unauthorized();
    if (decoded.slice(0, split) !== user || decoded.slice(split + 1) !== pass) return unauthorized();
  } catch {
    return unauthorized();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/review/:path*", "/api/radar/:path*"]
};
