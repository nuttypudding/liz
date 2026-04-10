"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, SignOutButton } from "@clerk/nextjs";
import { Building, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RoleCard } from "@/components/auth/role-card";

type Role = "landlord" | "tenant";

export default function RoleSelectPage() {
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const router = useRouter();
  const { session } = useClerk();

  async function handleSelect(role: Role) {
    setLoadingRole(role);

    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Role already set — redirect to appropriate page
        router.push(role === "landlord" ? "/dashboard" : "/submit");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to set role");
      }

      await session?.reload();
      router.push(data.redirect);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setLoadingRole(null);
    }
  }

  const disabled = loadingRole !== null;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome! Tell us about you.
        </h1>
        <p className="text-muted-foreground">
          Choose your role to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        <RoleCard
          icon={Building}
          title="I'm a Landlord"
          description="Manage properties, tenants, and maintenance"
          onClick={() => handleSelect("landlord")}
          loading={loadingRole === "landlord"}
          disabled={disabled}
        />
        <RoleCard
          icon={KeyRound}
          title="I'm a Tenant"
          description="Submit requests and communicate with your landlord"
          onClick={() => handleSelect("tenant")}
          loading={loadingRole === "tenant"}
          disabled={disabled}
        />
      </div>

      <SignOutButton>
        <Button variant="link" className="text-sm text-muted-foreground">
          Sign out
        </Button>
      </SignOutButton>
    </div>
  );
}
