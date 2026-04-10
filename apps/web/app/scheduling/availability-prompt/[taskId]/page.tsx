import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TenantAvailabilityPrompt } from "@/components/scheduling/TenantAvailabilityPrompt";

export default async function AvailabilityPromptPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { taskId } = await params;
  const supabase = createServerSupabaseClient();

  // Fetch task with related request and property for context
  const { data: task } = await supabase
    .from("scheduling_tasks")
    .select(
      `
      id,
      status,
      request_id,
      maintenance_requests!inner (
        ai_category,
        property_id,
        properties!inner (
          address_line1,
          city,
          state,
          postal_code,
          apt_or_unit_no
        )
      )
    `
    )
    .eq("id", taskId)
    .single();

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Not Found</h1>
          <p className="text-muted-foreground">
            This scheduling request could not be found.
          </p>
        </div>
      </div>
    );
  }

  if (task.status !== "awaiting_tenant") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold mb-2">
            Availability Already Submitted
          </h1>
          <p className="text-muted-foreground">
            Your availability has already been recorded. We&apos;ll notify you
            when the appointment is confirmed.
          </p>
        </div>
      </div>
    );
  }

  // Extract nested data — PostgREST returns the join as an object
  const request = task.maintenance_requests as unknown as {
    ai_category: string;
    properties: {
      address_line1: string;
      city: string;
      state: string;
      postal_code: string;
      apt_or_unit_no: string | null;
    };
  };

  const property = request.properties;
  const address = [
    property.address_line1,
    property.apt_or_unit_no ? `Unit ${property.apt_or_unit_no}` : null,
    `${property.city}, ${property.state} ${property.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Schedule Your Repair
          </h1>
          <p className="text-muted-foreground mt-1">
            Let us know when you&apos;re available
          </p>
        </div>
        <TenantAvailabilityPrompt
          taskId={taskId}
          category={request.ai_category ?? "general"}
          propertyAddress={address}
        />
      </div>
    </div>
  );
}
