export type AlertSeverity = "error" | "warning" | "info";

export interface JurisdictionReference {
  rule_topic: string;
  statute_citation: string;
  required_days: number | null;
}

export interface ComplianceAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  description: string;
  affected_item: string;
  suggested_action: string;
  jurisdiction_reference: JurisdictionReference | null;
  created_at: string;
}

export interface AlertsResponse {
  property_id: string;
  jurisdiction: { state_code: string; city: string | null } | null;
  alert_count: number;
  alerts: ComplianceAlert[];
}
