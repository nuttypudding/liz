// API response types matching Supabase schema + relations

export interface Property {
  id: string;
  name: string;
  address: string;
  unit_count: number | null;
  monthly_rent: number | null;
  landlord_id: string;
  created_at: string;
  tenants?: Tenant[];
}

export interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unit_number: string | null;
  property_id: string;
  clerk_user_id?: string | null;
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
}

export interface LandlordProfile {
  id: string;
  landlord_id: string;
  risk_appetite: 'cost_first' | 'speed_first' | 'balanced';
  delegation_mode: 'manual' | 'assist' | 'auto';
  max_auto_approve: number;
  notify_emergencies: boolean;
  notify_all_requests: boolean;
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
  properties: { id: string; name: string; address: string; landlord_id: string } | null;
  tenants: { id: string; name: string; email: string | null; phone: string | null; unit_number: string | null } | null;
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
