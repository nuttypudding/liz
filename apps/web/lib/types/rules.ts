/**
 * Automation Rules Types and Interfaces
 * Defines all TypeScript types for rule conditions, actions, and execution logs.
 */

/** Valid condition types that can be evaluated against maintenance requests */
export enum RuleConditionType {
  CATEGORY = "category",
  URGENCY = "urgency",
  COST_RANGE = "cost_range",
  PROPERTY_SELECTOR = "property_selector",
  VENDOR_AVAILABLE = "vendor_available",
}

/** Valid operators for condition evaluation */
export enum ConditionOperator {
  EQUALS = "equals",
  IN = "in",
  RANGE = "range",
  MATCHES = "matches",
}

/** Time window for scheduling-based conditions */
export interface TimeWindow {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
}

/** Base structure for rule conditions */
export interface RuleCondition {
  type: RuleConditionType;
  operator: ConditionOperator;
  value: unknown; // Varies by condition type
  time_window?: TimeWindow; // Optional time constraint
}

/** Valid action types that can be executed when rules match */
export enum RuleActionType {
  AUTO_APPROVE = "auto_approve",
  ASSIGN_VENDOR = "assign_vendor",
  NOTIFY_LANDLORD = "notify_landlord",
  ESCALATE = "escalate",
}

/** Notification methods */
export enum NotificationMethod {
  IN_APP = "in_app",
  EMAIL = "email",
  SMS = "sms",
}

/** Recipients for notifications */
export enum NotificationRecipient {
  LANDLORD = "landlord",
  VENDOR = "vendor",
  TENANT = "tenant",
}

/** Configuration for notification actions */
export interface NotifyConfig {
  method: NotificationMethod;
  recipients: NotificationRecipient[];
  custom_message?: string;
}

/** Action parameters based on action type */
export interface RuleActionParams {
  auto_approve?: {
    reason?: string;
  };
  assign_vendor?: {
    vendor_id: string;
  };
  notify_landlord?: NotifyConfig;
  escalate?: {
    priority: "high" | "critical";
    reason?: string;
  };
}

/** Rule action to execute when conditions match */
export interface RuleAction {
  type: RuleActionType;
  params: RuleActionParams;
}

/** Complete automation rule object */
export interface AutomationRule {
  id: string;
  landlord_id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  times_matched: number;
  last_matched_at?: string; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/** Result of evaluating a single condition */
export interface ConditionResult {
  condition_index: number;
  matched: boolean;
  details?: Record<string, unknown>;
}

/** Result of executing a single action */
export interface ExecutedAction {
  action_index: number;
  executed: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

/** Log entry for rule execution against a maintenance request */
export interface RuleExecutionLog {
  id: string;
  request_id: string;
  rule_id: string;
  landlord_id: string;
  matched: boolean;
  conditions_result?: ConditionResult[];
  actions_executed?: ExecutedAction[];
  evaluated_at: string; // ISO 8601 timestamp
}

/** Sample request for testing rule matching */
export interface RuleTestRequest {
  category?: string;
  urgency?: string;
  cost?: number;
  property_id?: string;
  vendor_ids?: string[];
}

/** Results from testing a rule */
export interface RuleTestResponse {
  matched: boolean;
  conditions_breakdown: ConditionResult[];
  actions_preview: RuleAction[];
}

/** Dashboard summary of rule activity */
export interface RulesSummary {
  active_rules: number;
  auto_approved_this_month: number;
  total_processed_this_month: number;
}

/** Request payload for creating a new rule */
export interface CreateRuleRequest {
  name: string;
  description?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority?: number;
  enabled?: boolean;
}

/** Request payload for updating an existing rule */
export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  priority?: number;
  enabled?: boolean;
}

/** Request payload for reordering rules by priority */
export interface ReorderRulesRequest {
  rule_id: string;
  new_priority: number;
}
