import { NextResponse, type NextRequest } from "next/server";

// Defense in depth: bounce unauthenticated requests away from the private
// areas before any page renders. Full authorization still happens server-side
// on every request; this only checks for the presence of a session cookie.
const SESSION_COOKIES = ["__Host-hdf_session", "hdf_session"];

function isProtected(pathname: string): boolean {
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/portal" ||
    pathname.startsWith("/portal/")
  );
}

function isEmbeddable(pathname: string): boolean {
  return pathname === "/embed" || pathname.startsWith("/embed/");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API handlers manage their own headers and request ids.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (isProtected(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("x-request-id", crypto.randomUUID());

  // Framing policy is applied here (not in next.config) so that the embeddable
  // chat widget can be framed while every other route stays clickjack-proof.
  if (isEmbeddable(pathname)) {
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  } else {
    response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
    response.headers.set("X-Frame-Options", "DENY");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|chat-widget.js|icon.svg|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|txt|xml)$).*)",
  ],
};
