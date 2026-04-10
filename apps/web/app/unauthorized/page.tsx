"use client";

import { ShieldAlert } from "lucide-react";
import { useClerk, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function UnauthorizedPage() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <ShieldAlert className="mx-auto size-12 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view this page.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={() => router.push("/")}>
              Go Home
            </Button>
            {isSignedIn && (
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
