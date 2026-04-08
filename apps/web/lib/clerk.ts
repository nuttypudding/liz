import { auth } from "@clerk/nextjs/server";

export async function getRole(): Promise<"landlord" | "tenant" | null> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata as { role?: string } | undefined)
    ?.role as "landlord" | "tenant" | null;
}

export async function requireRole(role: "landlord" | "tenant") {
  const currentRole = await getRole();
  if (currentRole !== role) {
    throw new Error(`Unauthorized: requires ${role} role`);
  }
}
