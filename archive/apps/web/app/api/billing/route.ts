import { NextResponse } from "next/server";

import { withAuth } from "@/lib/clerk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const GET = withAuth(async (userId) => {
  const supabase = createServerSupabaseClient();

  const { count: propertiesCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("landlord_id", userId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: requestsCount } = await supabase
    .from("maintenance_requests")
    .select("*", { count: "exact", head: true })
    .eq("landlord_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  return NextResponse.json({
    plan: {
      id: "free_beta",
      name: "Free (Beta)",
      price_monthly: 0,
      limits: { properties: 3, requests_per_month: 20 },
      status: "active",
    },
    usage: {
      properties_count: propertiesCount ?? 0,
      properties_limit: 3,
      requests_this_month: requestsCount ?? 0,
      requests_limit: 20,
    },
  });
}, { requiredRole: "landlord" });
