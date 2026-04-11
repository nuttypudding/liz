import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
  "/api/webhooks/stripe",
  "/api/reschedule(.*)",
  "/reschedule(.*)",
  "/unauthorized",
]);

// Routes that require auth but not a role
const isPreRoleRoute = createRouteMatcher([
  "/role-select",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth.protect();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
    ?? (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  const { pathname } = req.nextUrl;

  // Pre-role routes: allow authenticated users without a role
  if (isPreRoleRoute(req)) {
    // If user already has a role, redirect them away from role-select
    if (role) {
      const dest = role === "tenant" ? "/submit" : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return; // Allow access to /role-select without a role
  }

  // No role? Redirect to role selection
  if (!role) {
    return NextResponse.redirect(new URL("/role-select", req.url));
  }

  // Root redirect based on role
  if (pathname === "/") {
    const dest = role === "tenant" ? "/submit" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Tenant trying to access landlord pages
  if (role === "tenant" && (pathname.startsWith("/dashboard") || pathname.startsWith("/properties") || pathname.startsWith("/vendors") || pathname.startsWith("/requests") || pathname.startsWith("/billing") || pathname.startsWith("/settings") || pathname.startsWith("/onboarding"))) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Landlord trying to access tenant-only pages
  if (role === "landlord" && (pathname === "/submit" || pathname.startsWith("/my-requests"))) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
