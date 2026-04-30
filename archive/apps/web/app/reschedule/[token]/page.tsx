import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RescheduleForm } from "@/components/scheduling/RescheduleForm";

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServerSupabaseClient();

  // Validate token server-side before rendering
  const { data: tokenRow, error: tokenError } = await supabase
    .from("reschedule_tokens")
    .select("id, task_id, expires_at")
    .eq("token", token)
    .single();

  const isExpired =
    !tokenRow || !!tokenError || new Date(tokenRow.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
          <p className="text-muted-foreground">
            This reschedule link has expired or is no longer valid. Please
            contact your landlord directly to arrange a new appointment.
          </p>
        </div>
      </div>
    );
  }

  const taskId = tokenRow.task_id as string;

  // Fetch scheduling task with appointment details
  const { data: task } = await supabase
    .from("scheduling_tasks")
    .select(
      `
      id,
      status,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      maintenance_requests!inner (
        ai_category,
        work_order_text,
        properties!inner (
          address_line1,
          apt_or_unit_no,
          city,
          state,
          postal_code
        )
      )
    `
    )
    .eq("id", taskId)
    .single();

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Not Found</h1>
          <p className="text-muted-foreground">
            This scheduling request could not be found.
          </p>
        </div>
      </div>
    );
  }

  // Extract nested data
  const request = task.maintenance_requests as unknown as {
    ai_category: string;
    work_order_text: string | null;
    properties: {
      address_line1: string;
      apt_or_unit_no: string | null;
      city: string;
      state: string;
      postal_code: string;
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
            Request Reschedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Let the landlord know you need a different time
          </p>
        </div>
        <RescheduleForm
          token={token}
          taskId={taskId}
          appointment={{
            category: request.ai_category ?? "general",
            address,
            scheduledDate: (task.scheduled_date as string | null) ?? null,
            scheduledTimeStart: (task.scheduled_time_start as string | null) ?? null,
            scheduledTimeEnd: (task.scheduled_time_end as string | null) ?? null,
            workOrderText: request.work_order_text,
          }}
        />
      </div>
    </div>
  );
}
