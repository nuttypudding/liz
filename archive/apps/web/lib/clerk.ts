import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type Role = "landlord" | "tenant";

function coerceRole(value: unknown): Role | null {
  return value === "landlord" || value === "tenant" ? value : null;
}

/**
 * Read the current user's role.
 *
 * Fast path: session JWT `publicMetadata.role`.
 *
 * Slow path: fetch the user from Clerk backend. Handles the case where
 * metadata was updated after the session was issued (Clerk does not
 * auto-refresh JWT claims on metadata change).
 *
 * Bootstrap: if the session is authenticated but no role exists anywhere,
 * default the user to "landlord". MVP assumption: self-signup (public
 * /sign-up) is landlord-only; tenants are created by landlords and never
 * hit the signup UI.
 */
export async function getRole(): Promise<Role | null> {
  const { userId, sessionClaims } = await auth();

  const claimsRole = coerceRole(
    (sessionClaims?.publicMetadata as { role?: unknown } | undefined)?.role ??
      (sessionClaims?.metadata as { role?: unknown } | undefined)?.role
  );
  if (claimsRole) return claimsRole;

  if (!userId) return null;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const backendRole = coerceRole(
      (user.publicMetadata as { role?: unknown })?.role
    );
    if (backendRole) return backendRole;

    // Bootstrap: no role anywhere → default to landlord.
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: "landlord" },
    });
    return "landlord";
  } catch (err) {
    console.error("getRole: Clerk backend lookup/bootstrap failed", err);
    return null;
  }
}

export async function requireRole(role: Role) {
  const currentRole = await getRole();
  if (currentRole !== role) {
    throw new Error(`Unauthorized: requires ${role} role`);
  }
}

/**
 * Bootstrap a self-signup user as a landlord.
 *
 * MVP assumption: anyone who signs up through the public /sign-up flow is a
 * landlord. Tenants are created by landlords and never hit the signup UI.
 * Call this when `getRole()` returns null for an authenticated user.
 */
export async function bootstrapLandlordRole(userId: string): Promise<Role> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const existing = coerceRole((user.publicMetadata as { role?: unknown })?.role);
  if (existing) return existing;

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role: "landlord" },
  });
  return "landlord";
}

export function withAuth(
  handler: (userId: string, role: Role) => Promise<NextResponse>,
  options?: { requiredRole?: Role }
): (req?: Request) => Promise<NextResponse> {
  return async (req?: Request) => {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (!role) {
      return NextResponse.json({ error: "No role assigned" }, { status: 403 });
    }

    if (options?.requiredRole && role !== options.requiredRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(userId, role);
  };
}
