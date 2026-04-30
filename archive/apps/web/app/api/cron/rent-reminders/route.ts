import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDueDate(leaseStart: string, rentDueDay: number): string {
  const [year, month] = leaseStart.split("-");
  return `${year}-${month}-${String(rentDueDay).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET — this is a server-to-server call, not a Clerk session
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    const now = new Date();
    const todayStr = toDateStr(now);
    const plus3 = new Date(now);
    plus3.setUTCDate(now.getUTCDate() + 3);
    const plus3Str = toDateStr(plus3);

    // ─── Step 1: Status transitions ──────────────────────────────────────────

    const { data: activePeriods, error: fetchError } = await supabase
      .from("rent_periods")
      .select("id, status, lease_start, rent_due_day, property_id, tenant_id, updated_at, properties(landlord_id)")
      .in("status", ["upcoming", "due"]);

    if (fetchError) {
      console.error("Error fetching active rent periods:", fetchError);
      return NextResponse.json({ error: "Failed to fetch rent periods" }, { status: 500 });
    }

    const periods = activePeriods ?? [];

    const toDue: string[] = [];
    const toOverdue: string[] = [];

    for (const period of periods) {
      const dueDate = getDueDate(period.lease_start, period.rent_due_day);
      if (period.status === "upcoming" && dueDate <= todayStr) {
        toDue.push(period.id);
      } else if (period.status === "due" && dueDate < todayStr) {
        toOverdue.push(period.id);
      }
    }

    if (toDue.length > 0) {
      const { error: dueError } = await supabase
        .from("rent_periods")
        .update({ status: "due" })
        .in("id", toDue);
      if (dueError) {
        console.error("Error transitioning to due:", dueError);
      }
    }

    if (toOverdue.length > 0) {
      const { error: overdueError } = await supabase
        .from("rent_periods")
        .update({ status: "overdue" })
        .in("id", toOverdue);
      if (overdueError) {
        console.error("Error transitioning to overdue:", overdueError);
      }
    }

    // ─── Step 2: Reminder notifications ──────────────────────────────────────

    // Re-fetch after transitions to get accurate statuses
    const { data: allActivePeriods, error: refetchError } = await supabase
      .from("rent_periods")
      .select("id, status, lease_start, rent_due_day, property_id, tenant_id, updated_at, properties(landlord_id)")
      .in("status", ["upcoming", "due", "overdue"]);

    if (refetchError) {
      console.error("Error re-fetching rent periods:", refetchError);
      return NextResponse.json({ error: "Failed to re-fetch rent periods" }, { status: 500 });
    }

    // Gather distinct landlord IDs
    const landlordIds = [
      ...new Set(
        (allActivePeriods ?? [])
          .map((p) => (p.properties as unknown as { landlord_id: string } | null)?.landlord_id)
          .filter(Boolean) as string[]
      ),
    ];

    // Fetch landlord notification preferences
    const { data: profiles } = await supabase
      .from("landlord_profiles")
      .select("landlord_id, notify_rent_reminders, notify_rent_overdue_summary")
      .in("landlord_id", landlordIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.landlord_id, p])
    );

    // Fetch today's existing notifications to avoid duplicates on re-runs
    const { data: todayNotifications } = await supabase
      .from("notifications")
      .select("tenant_id, property_id, notification_type")
      .gte("sent_at", `${todayStr}T00:00:00Z`)
      .lt("sent_at", `${todayStr}T23:59:59.999Z`);

    // Key format: "{tenant_id}:{property_id}:{notification_type}"
    const existingSet = new Set(
      (todayNotifications ?? []).map(
        (n) => `${n.tenant_id}:${n.property_id}:${n.notification_type}`
      )
    );

    type NotificationInsert = {
      landlord_id: string;
      property_id: string;
      tenant_id: string | null;
      notification_type: string;
      subject: string;
      body: string;
      sent_at: string;
    };

    const notificationsToInsert: NotificationInsert[] = [];
    const sentAt = now.toISOString();

    for (const period of allActivePeriods ?? []) {
      const landlordId = (period.properties as unknown as { landlord_id: string } | null)?.landlord_id;
      if (!landlordId) continue;

      const profile = profileMap.get(landlordId);
      if (profile?.notify_rent_reminders === false) continue;

      const dueDate = getDueDate(period.lease_start, period.rent_due_day);

      // "Rent due in 3 days"
      if (period.status === "upcoming" && dueDate === plus3Str) {
        const key = `${period.tenant_id}:${period.property_id}:rent_due_reminder`;
        if (!existingSet.has(key)) {
          notificationsToInsert.push({
            landlord_id: landlordId,
            property_id: period.property_id,
            tenant_id: period.tenant_id,
            notification_type: "rent_due_reminder",
            subject: "Rent due in 3 days",
            body: `Rent is due on ${dueDate}.`,
            sent_at: sentAt,
          });
          existingSet.add(key);
        }
      }

      // "Rent due today"
      if (period.status === "due" && dueDate === todayStr) {
        const key = `${period.tenant_id}:${period.property_id}:rent_due_reminder`;
        if (!existingSet.has(key)) {
          notificationsToInsert.push({
            landlord_id: landlordId,
            property_id: period.property_id,
            tenant_id: period.tenant_id,
            notification_type: "rent_due_reminder",
            subject: "Rent due today",
            body: `Rent is due today (${dueDate}).`,
            sent_at: sentAt,
          });
          existingSet.add(key);
        }
      }

      // "Rent overdue" — only for periods transitioned to overdue today
      if (period.status === "overdue") {
        const updatedDate = period.updated_at?.split("T")[0];
        if (updatedDate === todayStr) {
          const key = `${period.tenant_id}:${period.property_id}:rent_overdue`;
          if (!existingSet.has(key)) {
            notificationsToInsert.push({
              landlord_id: landlordId,
              property_id: period.property_id,
              tenant_id: period.tenant_id,
              notification_type: "rent_overdue",
              subject: "Rent overdue",
              body: `Rent was due on ${dueDate} and is now overdue.`,
              sent_at: sentAt,
            });
            existingSet.add(key);
          }
        }
      }
    }

    // ─── Step 3: Landlord summary notification ────────────────────────────────

    const overduePeriods = (allActivePeriods ?? []).filter(
      (p) => p.status === "overdue"
    );

    const overdueByLandlord = new Map<string, { count: number; propertyId: string }>();
    for (const period of overduePeriods) {
      const landlordId = (period.properties as unknown as { landlord_id: string } | null)?.landlord_id;
      if (!landlordId) continue;
      const existing = overdueByLandlord.get(landlordId);
      if (existing) {
        existing.count += 1;
      } else {
        overdueByLandlord.set(landlordId, { count: 1, propertyId: period.property_id });
      }
    }

    for (const [landlordId, { count, propertyId }] of overdueByLandlord) {
      const profile = profileMap.get(landlordId);
      if (profile?.notify_rent_overdue_summary === false) continue;

      // Check if summary already sent today (tenant_id IS NULL means landlord-level summary)
      const { count: existingCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("landlord_id", landlordId)
        .eq("notification_type", "rent_overdue")
        .is("tenant_id", null)
        .gte("sent_at", `${todayStr}T00:00:00Z`)
        .lt("sent_at", `${todayStr}T23:59:59.999Z`);

      if ((existingCount ?? 0) === 0) {
        const tenantWord = count === 1 ? "tenant has" : "tenants have";
        notificationsToInsert.push({
          landlord_id: landlordId,
          property_id: propertyId,
          tenant_id: null,
          notification_type: "rent_overdue",
          subject: `${count} ${tenantWord} overdue rent`,
          body: `${count} of your ${tenantWord} overdue rent as of ${todayStr}.`,
          sent_at: sentAt,
        });
      }
    }

    // Insert all notifications in one batch
    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        return NextResponse.json({ error: "Failed to insert notifications" }, { status: 500 });
      }
    }

    return NextResponse.json({
      transitioned_to_due: toDue.length,
      transitioned_to_overdue: toOverdue.length,
      notifications_created: notificationsToInsert.length,
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/cron/rent-reminders:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
