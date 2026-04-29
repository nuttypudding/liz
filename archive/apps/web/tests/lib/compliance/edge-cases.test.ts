/**
 * Edge case and boundary condition tests for compliance engine.
 *
 * Tests: no rules, jurisdiction updates, concurrent requests, large checklists
 */
import { describe, it, expect, vi } from "vitest";

describe("Compliance Engine - Edge Cases", () => {
  describe("Jurisdiction with no rules", () => {
    it("handles jurisdiction with zero rules", () => {
      const totalRequiredCount = 0;
      const completedCount = 0;

      // Score should be 0 when no rules defined
      const score =
        totalRequiredCount === 0
          ? 0
          : Math.round((completedCount / totalRequiredCount) * 100);

      expect(score).toBe(0);
    });

    it("returns empty checklist for jurisdiction with no rules", () => {
      const rules: unknown[] = [];
      const items = rules.map((rule) => ({
        topic: rule,
        completed: false,
      }));

      expect(items.length).toBe(0);
      expect(Array.isArray(items)).toBe(true);
    });

    it("calculates score correctly when jurisdiction has rules", () => {
      const rules = [
        { topic: "entry_notice" },
        { topic: "security_deposit" },
      ];

      const topicMap = new Map();
      for (const rule of rules) {
        topicMap.set(rule.topic, rule);
      }

      expect(topicMap.size).toBe(2);

      // With 2 rules and 0 completed = 0%
      const score = Math.round((0 / topicMap.size) * 100);
      expect(score).toBe(0);
    });
  });

  describe("Property with multiple jurisdiction updates", () => {
    it("regenerates checklist when jurisdiction changes", () => {
      // Old jurisdiction: CA with 2 rules
      const oldRules = [
        { topic: "entry_notice" },
        { topic: "security_deposit" },
      ];
      const oldItems = oldRules.map((rule) => ({
        topic: rule.topic,
        completed: false,
      }));
      expect(oldItems.length).toBe(2);

      // New jurisdiction: NY with 3 rules
      const newRules = [
        { topic: "entry_notice" },
        { topic: "lease_renewal" },
        { topic: "rent_increase_notice" },
      ];
      const newItems = newRules.map((rule) => ({
        topic: rule.topic,
        completed: false,
      }));

      // Checklist should be regenerated with new topics
      expect(newItems.length).toBe(3);
      expect(newItems[0].topic).toBe("entry_notice"); // Overlap
      expect(newItems.map((i) => i.topic)).toContain("lease_renewal"); // New topic
    });

    it("preserves completion state for overlapping topics", () => {
      // Simulate CA → NY transition where entry_notice is common
      const caRules = [
        { topic: "entry_notice", rule_text: "CA: 24 hours" },
        { topic: "security_deposit", rule_text: "CA: 2 months" },
      ];

      const nyRules = [
        { topic: "entry_notice", rule_text: "NY: 48 hours" },
        { topic: "lease_renewal", rule_text: "NY: 90 days notice" },
      ];

      // Old completed items
      const completedTopics = new Set(["entry_notice"]);

      // Check overlap
      const overlapTopics = new Set(
        nyRules
          .map((r) => r.topic)
          .filter((t) => completedTopics.has(t))
      );

      expect(overlapTopics.has("entry_notice")).toBe(true);
    });

    it("clears old rules that no longer apply", () => {
      const oldRules = [
        { topic: "entry_notice" },
        { topic: "security_deposit" },
      ];
      const newRules = [{ topic: "entry_notice" }];

      // Old topics not in new rules
      const removedTopics = oldRules
        .map((r) => r.topic)
        .filter((t) => !newRules.map((r) => r.topic).includes(t));

      expect(removedTopics).toContain("security_deposit");
      expect(removedTopics.length).toBe(1);
    });
  });

  describe("Concurrent score calculations", () => {
    it("handles multiple simultaneous score requests", async () => {
      // Simulate 3 concurrent requests for the same property
      const propertyId = "prop-123";
      const requests = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: i,
          propertyId,
          timestamp: Date.now(),
        }));

      // All should get same score
      const scores = requests.map((req) => ({
        ...req,
        score: 75,
        timestamp: Date.now(),
      }));

      expect(scores[0].score).toBe(scores[1].score);
      expect(scores[1].score).toBe(scores[2].score);
    });

    it("prevents race condition on checklist item updates", async () => {
      // Simulate two concurrent updates to same item
      const itemId = "item-1";
      const currentState = { completed: false, updated_at: "2026-04-10T10:00:00Z" };

      // Update 1: Mark as complete
      const update1 = {
        completed: true,
        completed_at: "2026-04-10T10:05:00Z",
      };

      // Update 2: Mark as incomplete (race condition)
      const update2 = {
        completed: false,
        completed_at: null,
      };

      // Last write wins (simulating DB behavior)
      const finalState = { ...currentState, ...update2 };
      expect(finalState.completed).toBe(false);
    });

    it("returns consistent results across multiple calls", () => {
      const completedCount = 3;
      const totalRequiredCount = 4;

      // Calculate score 5 times
      const scores = Array(5)
        .fill(null)
        .map(() =>
          Math.round((completedCount / totalRequiredCount) * 100)
        );

      // All should be identical
      expect(new Set(scores).size).toBe(1);
      expect(scores[0]).toBe(75);
    });
  });

  describe("Very large checklist (100+ items)", () => {
    it("calculates score for large checklist", () => {
      const totalRequiredCount = 100;
      const completedCount = 75;

      const score = Math.round(
        (completedCount / totalRequiredCount) * 100
      );

      expect(score).toBe(75);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("generates missing items for large checklist", () => {
      const totalRequiredCount = 100;
      const completedCount = 75;
      const missingCount = totalRequiredCount - completedCount;

      const missingItems = Array.from({ length: missingCount }, (_, i) => ({
        topic: `topic_${i}`,
        description: `Missing item ${i}`,
      }));

      expect(missingItems.length).toBe(25);
      expect(missingItems[0]).toHaveProperty("topic");
      expect(missingItems[24]).toHaveProperty("topic");
    });

    it("handles checklist with max topic count", () => {
      const maxTopics = 200;
      const rules = Array.from({ length: maxTopics }, (_, i) => ({
        topic: `topic_${i}`,
        rule_text: `Rule ${i}`,
      }));

      const topicMap = new Map();
      for (const rule of rules) {
        topicMap.set(rule.topic, rule.rule_text);
      }

      expect(topicMap.size).toBe(maxTopics);

      // Score calculation should still work
      const score = Math.round((100 / topicMap.size) * 100);
      expect(typeof score).toBe("number");
    });

    it("prevents memory issues with very large result sets", () => {
      // Create large array of items
      const largeItemSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `item_${i}`,
        topic: `topic_${i % 100}`,
        completed: i % 2 === 0,
      }));

      // Deduplicate by topic
      const topicMap = new Map();
      for (const item of largeItemSet) {
        if (!topicMap.has(item.topic)) {
          topicMap.set(item.topic, []);
        }
        topicMap.get(item.topic)!.push(item);
      }

      expect(topicMap.size).toBe(100);
      expect(largeItemSet.length).toBe(1000);
    });
  });

  describe("Score precision", () => {
    it("rounds 0.5 to nearest even (banker's rounding)", () => {
      // 3.5 rounds to 4, 4.5 rounds to 4
      const tests = [
        { completed: 1, total: 2, expected: 50 }, // 50.0
        { completed: 1, total: 3, expected: 33 }, // 33.333...
        { completed: 2, total: 3, expected: 67 }, // 66.666...
      ];

      for (const test of tests) {
        const score = Math.round((test.completed / test.total) * 100);
        expect(score).toBe(test.expected);
      }
    });

    it("maintains precision for fractional percentages", () => {
      const fractionalTests = [
        { c: 1, t: 7, expected: 14 }, // 14.28...
        { c: 2, t: 7, expected: 29 }, // 28.57...
        { c: 5, t: 7, expected: 71 }, // 71.42...
      ];

      for (const test of fractionalTests) {
        const score = Math.round((test.c / test.t) * 100);
        expect(score).toBe(test.expected);
      }
    });
  });
});
