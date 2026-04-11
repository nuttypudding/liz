// API response types matching Supabase schema + relations

export interface Property {
  id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  apt_or_unit_no: string | null;
  unit_count: number | null;
  monthly_rent: number | null;
  rent_due_day: number;
  landlord_id: string;
  created_at: string;
  tenants?: Tenant[];
}

export interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  unit_number: string | null;
  property_id: string;
  clerk_user_id?: string | null;
  move_in_date: string | null;
  lease_type: 'yearly' | 'month_to_month' | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  rent_due_day: number | null;
  custom_fields: Record<string, string> | null;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  specialty: string;
  notes: string | null;
  landlord_id: string;
  preferred: boolean;
  priority_rank: number;
  custom_fields: Record<string, string> | null;
}

export interface LandlordProfile {
  id: string;
  landlord_id: string;
  risk_appetite: 'cost_first' | 'speed_first' | 'balanced';
  delegation_mode: 'manual' | 'assist' | 'auto';
  max_auto_approve: number;
  notify_emergencies: boolean;
  notify_all_requests: boolean;
  notify_rent_reminders: boolean;
  notify_rent_overdue_summary: boolean;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  tenant_message: string;
  ai_category: string | null;
  ai_urgency: string | null;
  ai_recommended_action: string | null;
  ai_cost_estimate_low: number | null;
  ai_cost_estimate_high: number | null;
  ai_confidence_score: number | null;
  status: string;
  property_id: string;
  tenant_id: string;
  vendor_id: string | null;
  work_order_text: string | null;
  landlord_notes: string | null;
  actual_cost: number | null;
  created_at: string;
  resolved_at: string | null;
  dispatched_at: string | null;
  properties: {
    id: string;
    name: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    landlord_id: string;
  } | null;
  tenants: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    unit_number: string | null;
  } | null;
  vendors: { id: string; name: string; phone: string | null; email: string | null; specialty: string } | null;
  request_photos: { id: string; storage_path: string; file_type: string }[];
}

export interface DashboardStats {
  emergency_count: number;
  open_count: number;
  avg_resolution_days: number;
  monthly_spend: number;
}

export interface SpendChartItem {
  property_name: string;
  spend: number;
  rent: number;
}

export interface RentPayment {
  id: string;
  property_id: string;
  tenant_id: string | null;
  amount: number;
  paid_at: string;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
}

export interface RentStatus {
  property_id: string;
  monthly_rent: number;
  rent_due_day: number;
  last_paid_at: string | null;
  last_paid_amount: number | null;
  is_overdue: boolean;
  days_overdue: number;
}

export type DocumentType =
  | 'lease'
  | 'receipt'
  | 'inspection_move_in'
  | 'inspection_move_out'
  | 'property_photo'
  | 'other';

export interface Document {
  id: string;
  property_id: string;
  tenant_id: string | null;
  landlord_id: string;
  document_type: DocumentType;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description: string | null;
  uploaded_at: string;
  tenant_name?: string | null;
}

export type UtilityType =
  | 'electric'
  | 'gas'
  | 'water_sewer'
  | 'trash_recycling'
  | 'internet_cable'
  | 'hoa';

export type ConfirmationStatus = 'ai_suggested' | 'confirmed' | 'not_applicable';
export type AiConfidence = 'high' | 'medium' | 'low';

export interface PropertyUtility {
  id: string;
  property_id: string;
  utility_type: UtilityType;
  provider_name: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  account_number: string | null;
  confirmation_status: ConfirmationStatus;
  ai_confidence: AiConfidence | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UtilitySuggestion {
  utility_type: UtilityType;
  provider_name: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  confidence: AiConfidence;
}

export interface UtilityUpsertPayload {
  utilities: Array<{
    utility_type: UtilityType;
    provider_name: string | null;
    provider_phone: string | null;
    provider_website: string | null;
    account_number: string | null;
    confirmation_status: ConfirmationStatus;
    notes: string | null;
  }>;
}

export interface BillingPlan {
  id: string;
  name: string;
  price_monthly: number;
  limits: { properties: number; requests_per_month: number };
  status: "active" | "coming_soon";
}

export interface BillingUsage {
  properties_count: number;
  properties_limit: number;
  requests_this_month: number;
  requests_limit: number;
  plan: BillingPlan;
}

// Rent reminder feature types
export type RentPeriodStatus = 'upcoming' | 'due' | 'overdue' | 'partial' | 'paid';

export interface RentPeriod {
  id: string;
  property_id: string;
  tenant_id: string;
  lease_start: string;
  lease_end: string | null;
  monthly_rent: number;
  rent_due_day: number;
  created_at: string;
  updated_at: string;
}

export interface RentSummary {
  property_id: string;
  property_name: string;
  upcoming_count: number;
  due_count: number;
  overdue_count: number;
  partial_count: number;
  paid_count: number;
  total_due_amount: number;
  total_overdue_amount: number;
  last_payment_date: string | null;
}

export type NotificationType = 'rent_due_reminder' | 'rent_overdue' | 'rent_paid';

export interface Notification {
  id: string;
  landlord_id: string;
  property_id: string;
  tenant_id: string | null;
  notification_type: NotificationType;
  subject: string;
  body: string;
  sent_at: string;
  read_at: string | null;
  created_at: string;
}
