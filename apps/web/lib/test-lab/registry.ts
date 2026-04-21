import type { TestableComponent } from "@/lib/types/test-lab";

export const TEST_LAB_COMPONENTS: TestableComponent[] = [
  {
    name: "triage",
    label: "Triage Classifier",
    description:
      "AI maintenance intake classifier — Gatekeeper (self-resolvable check) + Estimator (category, urgency, cost).",
    sample_count: 20,
  },
];

export function getComponent(name: string): TestableComponent | undefined {
  return TEST_LAB_COMPONENTS.find((c) => c.name === name);
}
