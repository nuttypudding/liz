import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth.protect();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  const { pathname } = req.nextUrl;

  // Root redirect based on role
  if (pathname === "/") {
    const dest = role === "tenant" ? "/submit" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Tenant trying to access landlord pages
  if (role === "tenant" && (pathname.startsWith("/dashboard") || pathname.startsWith("/properties") || pathname.startsWith("/vendors") || pathname.startsWith("/requests"))) {
    return NextResponse.redirect(new URL("/submit", req.url));
  }

  // Landlord trying to access tenant-only pages
  if (role === "landlord" && (pathname === "/submit" || pathname.startsWith("/my-requests"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
