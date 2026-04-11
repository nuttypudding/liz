import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/service";

export async function sendLandlordAutoDispatchNotification({
  supabase,
  landlordId,
  requestId,
  category,
  urgency,
  vendorId,
}: {
  supabase: SupabaseClient;
  landlordId: string;
  requestId: string;
  category: string;
  urgency: string;
  vendorId: string;
}): Promise<void> {
  // Fetch landlord email from Clerk
  const client = await clerkClient();
  const landlordUser = await client.users.getUser(landlordId);
  const landlordEmail = landlordUser.emailAddresses?.[0]?.emailAddress;
  if (!landlordEmail) {
    console.warn("[autonomy] No landlord email found — skipping dispatch notification");
    return;
  }

  // Fetch request details for the notification body
  const { data: requestDetails } = await supabase
    .from("maintenance_requests")
    .select(
      "id, tenant_message, tenants(first_name, last_name), properties(name, address_line1, city, state), vendors(name)"
    )
    .eq("id", requestId)
    .single();

  // Supabase join returns object (not array) at runtime even though types say otherwise
  const tenants = (requestDetails?.tenants ?? null) as unknown as
    | { first_name: string; last_name: string }
    | null;
  const properties = (requestDetails?.properties ?? null) as unknown as
    | { name: string; address_line1: string; city: string; state: string }
    | null;
  const vendors = (requestDetails?.vendors ?? null) as unknown as
    | { name: string }
    | null;

  const tenantName = tenants
    ? `${tenants.first_name} ${tenants.last_name}`
    : "Tenant";
  const propertyName = properties
    ? `${properties.name ?? properties.address_line1}, ${properties.city}, ${properties.state}`
    : "Property";
  const vendorName = vendors?.name ?? "Assigned vendor";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://web-lovat-sigma-36.vercel.app";
  const requestLink = `${baseUrl}/requests/${requestId}`;
  const isEmergency = urgency === "emergency";
  const template = isEmergency
    ? "emergency-auto-dispatch"
    : "auto-dispatch-confirmation";

  await sendNotification("landlord", landlordId, "email", template, {
    to: landlordEmail,
    tenantName,
    propertyName,
    category,
    urgency,
    vendorName,
    requestLink,
  });
}
