import { SupabaseClient } from "@supabase/supabase-js";

import {
  AutomationRule,
  RuleConditionType,
  RuleActionType,
  StaleReference,
} from "@/lib/types/rules";

/**
 * Detect stale references in a set of automation rules.
 *
 * Checks whether vendors and properties referenced in rule conditions/actions
 * still exist in the database. Returns stale references grouped by rule id.
 *
 * Performance: issues two batched queries (one for vendors, one for properties)
 * regardless of how many rules are checked.
 */
export async function detectStaleReferences(
  rules: AutomationRule[],
  landlord_id: string,
  supabase: SupabaseClient
): Promise<Map<string, StaleReference[]>> {
  // Collect all unique ids to check
  const vendorRefs: Array<{ ruleId: string; id: string; location: string }> = [];
  const propertyRefs: Array<{ ruleId: string; id: string; location: string }> = [];

  for (const rule of rules) {
    // Conditions
    rule.conditions.forEach((condition, ci) => {
      if (condition.type === RuleConditionType.VENDOR_AVAILABLE) {
        const ids = condition.value as string[];
        ids.forEach((id, vi) => {
          if (id) {
            vendorRefs.push({
              ruleId: rule.id,
              id,
              location: `condition[${ci}].value[${vi}]`,
            });
          }
        });
      } else if (condition.type === RuleConditionType.PROPERTY_SELECTOR) {
        const ids = Array.isArray(condition.value)
          ? (condition.value as string[])
          : [condition.value as string];
        ids.forEach((id, pi) => {
          if (id) {
            propertyRefs.push({
              ruleId: rule.id,
              id,
              location: `condition[${ci}].value[${pi}]`,
            });
          }
        });
      }
    });

    // Actions
    rule.actions.forEach((action, ai) => {
      if (action.type === RuleActionType.ASSIGN_VENDOR) {
        const vendorId = action.params.assign_vendor?.vendor_id;
        if (vendorId) {
          vendorRefs.push({
            ruleId: rule.id,
            id: vendorId,
            location: `action[${ai}].params.vendor_id`,
          });
        }
      }
    });
  }

  // Batch-query existing vendors and properties
  const uniqueVendorIds = [...new Set(vendorRefs.map((r) => r.id))];
  const uniquePropertyIds = [...new Set(propertyRefs.map((r) => r.id))];

  const [existingVendors, existingProperties] = await Promise.all([
    uniqueVendorIds.length > 0
      ? supabase
          .from("vendors")
          .select("id")
          .eq("landlord_id", landlord_id)
          .in("id", uniqueVendorIds)
          .then(({ data }) => new Set((data ?? []).map((r: { id: string }) => r.id)))
      : Promise.resolve(new Set<string>()),
    uniquePropertyIds.length > 0
      ? supabase
          .from("properties")
          .select("id")
          .eq("landlord_id", landlord_id)
          .in("id", uniquePropertyIds)
          .then(({ data }) => new Set((data ?? []).map((r: { id: string }) => r.id)))
      : Promise.resolve(new Set<string>()),
  ]);

  // Build stale reference map keyed by rule id
  const result = new Map<string, StaleReference[]>();

  for (const ref of vendorRefs) {
    if (!existingVendors.has(ref.id)) {
      const list = result.get(ref.ruleId) ?? [];
      list.push({
        type: "vendor",
        id: ref.id,
        location: ref.location,
        message: "Assigned vendor no longer exists",
      });
      result.set(ref.ruleId, list);
    }
  }

  for (const ref of propertyRefs) {
    if (!existingProperties.has(ref.id)) {
      const list = result.get(ref.ruleId) ?? [];
      list.push({
        type: "property",
        id: ref.id,
        location: ref.location,
        message: "Referenced property no longer exists",
      });
      result.set(ref.ruleId, list);
    }
  }

  return result;
}
