/**
 * Unit tests for compliance score calculation logic.
 *
 * Tests: score calculation, missing items tracking, score updates
 */
import { describe, it, expect } from "vitest";

/**
 * Calculate compliance score from completed/total items
 */
function calculateComplianceScore(
  completedCount: number,
  totalRequiredCount: number
): {
  score: number;
  completed_count: number;
  total_required_count: number;
  missing_items: Array<{ topic: string; description: string }>;
} {
  const score =
    totalRequiredCount === 0
      ? 0
      : Math.round((completedCount / totalRequiredCount) * 100);

  // Mock missing items for simplicity
  const missingItems = Array.from({ length: totalRequiredCount - completedCount }, (_, i) => ({
    topic: `topic_${i}`,
    description: `Missing item ${i}`,
  }));

  return {
    score,
    completed_count: completedCount,
    total_required_count: totalRequiredCount,
    missing_items: missingItems,
  };
}

describe("Compliance Score Calculation", () => {
  describe("calculateComplianceScore", () => {
    it("calculates correct score (0-100)", () => {
      // 3 of 4 items complete = 75%
      const result = calculateComplianceScore(3, 4);
      expect(result.score).toBe(75);
    });

    it("returns 100 when all items complete", () => {
      const result = calculateComplianceScore(4, 4);
      expect(result.score).toBe(100);
    });

    it("returns 0 when no items complete", () => {
      const result = calculateComplianceScore(0, 4);
      expect(result.score).toBe(0);
    });

    it("rounds to nearest integer", () => {
      // 2 of 3 items = 66.666% → 67%
      const result = calculateComplianceScore(2, 3);
      expect(result.score).toBe(67);
    });

    it("handles zero required items gracefully", () => {
      const result = calculateComplianceScore(0, 0);
      expect(result.score).toBe(0);
      expect(result.total_required_count).toBe(0);
    });

    it("returns correct structure with all fields", () => {
      const result = calculateComplianceScore(2, 4);
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("completed_count");
      expect(result).toHaveProperty("total_required_count");
      expect(result).toHaveProperty("missing_items");
    });
  });

  describe("Missing Items Tracking", () => {
    it("returns missing items correctly", () => {
      // 2 of 4 complete = 2 missing
      const result = calculateComplianceScore(2, 4);
      expect(result.missing_items.length).toBe(2);
      expect(result.missing_items[0]).toHaveProperty("topic");
      expect(result.missing_items[0]).toHaveProperty("description");
    });

    it("returns empty missing items array when all complete", () => {
      const result = calculateComplianceScore(4, 4);
      expect(result.missing_items.length).toBe(0);
    });

    it("returns all items as missing when none complete", () => {
      const result = calculateComplianceScore(0, 4);
      expect(result.missing_items.length).toBe(4);
    });

    it("maintains missing items order", () => {
      const result = calculateComplianceScore(1, 3);
      expect(result.missing_items.length).toBe(2);
      // Should have items in order
      expect(result.missing_items[0].topic).toBe("topic_0");
      expect(result.missing_items[1].topic).toBe("topic_1");
    });
  });

  describe("Edge Cases", () => {
    it("handles very large completion rates", () => {
      const result = calculateComplianceScore(99, 100);
      expect(result.score).toBe(99);
    });

    it("handles single item", () => {
      const completed = calculateComplianceScore(1, 1);
      expect(completed.score).toBe(100);

      const incomplete = calculateComplianceScore(0, 1);
      expect(incomplete.score).toBe(0);
    });

    it("handles fractional percentages that round down", () => {
      // 1 of 3 = 33.333% → 33%
      const result = calculateComplianceScore(1, 3);
      expect(result.score).toBe(33);
    });

    it("handles fractional percentages that round up", () => {
      // 2 of 3 = 66.666% → 67%
      const result = calculateComplianceScore(2, 3);
      expect(result.score).toBe(67);
    });
  });
});
