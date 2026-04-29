/**
 * Zod validation schemas for automation rules
 * Provides runtime validation for rule conditions, actions, and API payloads.
 */

import { z } from "zod";
import {
  RuleConditionType,
  ConditionOperator,
  RuleActionType,
  NotificationMethod,
  NotificationRecipient,
} from "@/lib/types/rules";

// Helper: Time window validation
const TimeWindowSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

// Condition validation schemas
const CategoryConditionSchema = z.object({
  type: z.literal(RuleConditionType.CATEGORY),
  operator: z.enum([ConditionOperator.EQUALS, ConditionOperator.IN]),
  value: z.union([
    z.string(),
    z.array(z.string()),
  ]),
  time_window: TimeWindowSchema.optional(),
});

const UrgencyConditionSchema = z.object({
  type: z.literal(RuleConditionType.URGENCY),
  operator: z.enum([ConditionOperator.EQUALS, ConditionOperator.IN]),
  value: z.union([
    z.string(),
    z.array(z.string()),
  ]),
  time_window: TimeWindowSchema.optional(),
});

const CostRangeConditionSchema = z.object({
  type: z.literal(RuleConditionType.COST_RANGE),
  operator: z.literal(ConditionOperator.RANGE),
  value: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }),
  time_window: TimeWindowSchema.optional(),
});

const PropertySelectorConditionSchema = z.object({
  type: z.literal(RuleConditionType.PROPERTY_SELECTOR),
  operator: z.enum([ConditionOperator.EQUALS, ConditionOperator.IN]),
  value: z.union([
    z.string(),
    z.array(z.string()),
  ]),
  time_window: TimeWindowSchema.optional(),
});

const VendorAvailableConditionSchema = z.object({
  type: z.literal(RuleConditionType.VENDOR_AVAILABLE),
  operator: z.literal(ConditionOperator.EQUALS),
  value: z.array(z.string()), // vendor IDs
  time_window: TimeWindowSchema.optional(),
});

export const ZodRuleCondition = z.union([
  CategoryConditionSchema,
  UrgencyConditionSchema,
  CostRangeConditionSchema,
  PropertySelectorConditionSchema,
  VendorAvailableConditionSchema,
]);

// Action validation schemas
const AutoApproveActionSchema = z.object({
  type: z.literal(RuleActionType.AUTO_APPROVE),
  params: z.object({
    auto_approve: z.object({
      reason: z.string().optional(),
    }).optional(),
  }),
});

const AssignVendorActionSchema = z.object({
  type: z.literal(RuleActionType.ASSIGN_VENDOR),
  params: z.object({
    assign_vendor: z.object({
      vendor_id: z.string().uuid(),
    }).optional(),
  }),
});

const NotifyConfigSchema = z.object({
  method: z.enum([
    NotificationMethod.IN_APP,
    NotificationMethod.EMAIL,
    NotificationMethod.SMS,
  ]),
  recipients: z.array(
    z.enum([
      NotificationRecipient.LANDLORD,
      NotificationRecipient.VENDOR,
      NotificationRecipient.TENANT,
    ])
  ),
  custom_message: z.string().optional(),
});

const NotifyLandlordActionSchema = z.object({
  type: z.literal(RuleActionType.NOTIFY_LANDLORD),
  params: z.object({
    notify_landlord: NotifyConfigSchema.optional(),
  }),
});

const EscalateActionSchema = z.object({
  type: z.literal(RuleActionType.ESCALATE),
  params: z.object({
    escalate: z.object({
      priority: z.enum(["high", "critical"]),
      reason: z.string().optional(),
    }).optional(),
  }),
});

export const ZodRuleAction = z.union([
  AutoApproveActionSchema,
  AssignVendorActionSchema,
  NotifyLandlordActionSchema,
  EscalateActionSchema,
]);

// API request validation schemas
export const ZodAutomationRuleCreate = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  conditions: z.array(ZodRuleCondition).min(1),
  actions: z.array(ZodRuleAction).min(1),
  priority: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
});

export const ZodAutomationRuleUpdate = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  conditions: z.array(ZodRuleCondition).min(1).optional(),
  actions: z.array(ZodRuleAction).min(1).optional(),
  priority: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
});

export const ZodRuleReorderRequest = z.object({
  rule_id: z.string().uuid(),
  new_priority: z.number().int().min(0).max(999),
});

export const ZodRuleTestRequest = z.object({
  category: z.string().optional(),
  urgency: z.string().optional(),
  cost: z.number().positive().optional(),
  property_id: z.string().uuid().optional(),
  vendor_ids: z.array(z.string().uuid()).optional(),
});

// Type inference for API requests
export type CreateRulePayload = z.infer<typeof ZodAutomationRuleCreate>;
export type UpdateRulePayload = z.infer<typeof ZodAutomationRuleUpdate>;
export type ReorderRulesPayload = z.infer<typeof ZodRuleReorderRequest>;
export type TestRulePayload = z.infer<typeof ZodRuleTestRequest>;
