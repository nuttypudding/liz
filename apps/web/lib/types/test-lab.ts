export interface TestRun {
  id: string;
  landlord_id: string;
  component_name: string;
  status: "pending" | "running" | "completed" | "failed";
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  test_cases?: TestCase[];
}

export interface TestCase {
  id: string;
  run_id: string;
  sample_id: string;
  status: "pending" | "running" | "passed" | "failed" | "error";
  input_message: string | null;
  expected_category: string | null;
  expected_urgency: string | null;
  actual_category: string | null;
  actual_urgency: string | null;
  expected_output: Record<string, unknown> | null;
  actual_output: Record<string, unknown> | null;
  category_match: boolean | null;
  urgency_match: boolean | null;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface TestableComponent {
  name: string;
  label: string;
  description: string;
  sample_count: number;
}
