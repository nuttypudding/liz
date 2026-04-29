"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  ShieldCheck,
  Brain,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AutonomousDecision } from "@/lib/types/autonomy";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyStats {
  total_decisions: number;
  auto_dispatched: number;
  escalated: number;
  overridden: number;
  total_spend: number;
  trust_score: number | null;
}

interface CategoryData {
  name: string;
  value: number;
  fill: string;
}

interface ConfidenceBucket {
  range: string;
  count: number;
  fill: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  plumbing: "hsl(210, 70%, 50%)",
  electrical: "hsl(45, 85%, 55%)",
  hvac: "hsl(190, 65%, 45%)",
  structural: "hsl(0, 65%, 55%)",
  pest: "hsl(30, 75%, 50%)",
  appliance: "hsl(270, 60%, 55%)",
  general: "hsl(150, 50%, 45%)",
};

const CONFIDENCE_COLORS = [
  "hsl(0, 65%, 55%)",
  "hsl(35, 80%, 55%)",
  "hsl(55, 75%, 50%)",
  "hsl(140, 60%, 45%)",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return `${MONTH_NAMES[mon - 1]} ${year}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function trustColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 0.8) return "text-green-600 dark:text-green-400";
  if (score >= 0.6) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function extractCategory(decision: AutonomousDecision): string {
  const reasoning = decision.reasoning?.toLowerCase() ?? "";
  for (const cat of Object.keys(CATEGORY_COLORS)) {
    if (reasoning.includes(cat)) return cat;
  }
  return "general";
}

function extractCost(decision: AutonomousDecision): number {
  const cost = (decision.actions_taken as Record<string, unknown> | null)
    ?.estimated_cost;
  return typeof cost === "number" ? cost : 0;
}

// ─── Chart Configs ────────────────────────────────────────────────────────────

function buildCategoryChartConfig(
  data: CategoryData[]
): ChartConfig {
  const config: ChartConfig = {};
  for (const d of data) {
    config[d.name] = { label: d.name.charAt(0).toUpperCase() + d.name.slice(1), color: d.fill };
  }
  return config;
}

const confidenceChartConfig: ChartConfig = {
  count: { label: "Decisions" },
  "0-0.5": { label: "Low (0-0.5)", color: CONFIDENCE_COLORS[0] },
  "0.5-0.7": { label: "Med-Low (0.5-0.7)", color: CONFIDENCE_COLORS[1] },
  "0.7-0.85": { label: "Med-High (0.7-0.85)", color: CONFIDENCE_COLORS[2] },
  "0.85-1.0": { label: "High (0.85-1.0)", color: CONFIDENCE_COLORS[3] },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [decisions, setDecisions] = useState<AutonomousDecision[]>([]);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const isFutureMonth = month > getCurrentMonth();

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const [statsRes, decisionsRes] = await Promise.all([
        fetch(`/api/autonomy/stats?month=${m}`),
        fetch(`/api/autonomy/decisions?limit=50&sort=-created_at`),
      ]);

      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      if (!decisionsRes.ok) throw new Error("Failed to fetch decisions");

      const { stats: s } = await statsRes.json();
      const { decisions: d } = await decisionsRes.json();

      setStats({
        total_decisions: s.total_decisions ?? 0,
        auto_dispatched: s.auto_dispatched ?? 0,
        escalated: s.escalated ?? 0,
        overridden: s.overridden ?? 0,
        total_spend: s.total_spend ?? 0,
        trust_score: s.trust_score ?? null,
      });
      setDecisions(d ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
  }, [month, fetchData]);

  // Generate AI recommendation from stats
  const generateRecommendation = useCallback(async () => {
    if (!stats) return;
    setRecLoading(true);
    try {
      // Build a simple recommendation locally based on stats
      // (In production, this would call Claude API; for now, rule-based)
      const rec = buildRecommendation(stats);
      setRecommendation(rec);
    } finally {
      setRecLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    if (stats && !recommendation && !loading) {
      generateRecommendation();
    }
  }, [stats, recommendation, loading, generateRecommendation]);

  // ─── Data Transformations ─────────────────────────────────────────────────

  const spendByCategory: CategoryData[] = computeSpendByCategory(decisions);
  const decisionsByCategory: CategoryData[] =
    computeDecisionsByCategory(decisions);
  const confidenceDistribution: ConfidenceBucket[] =
    computeConfidenceDistribution(decisions);
  const avgConfidence = computeAvgConfidence(decisions);

  // ─── Month Navigation ─────────────────────────────────────────────────────

  function handlePrev() {
    setMonth((m) => shiftMonth(m, -1));
  }
  function handleNext() {
    if (!isFutureMonth) setMonth((m) => shiftMonth(m, 1));
  }

  // ─── Error State ──────────────────────────────────────────────────────────

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Monthly Report"
          description="Autonomy performance report"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchData(month)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Monthly Report"
          description="Autonomy performance report"
        />
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-9" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-36" />
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Report"
        description="Autonomy performance report"
      />

      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium">{formatMonth(month)}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isFutureMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total Decisions"
          value={s.total_decisions}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Auto-dispatched"
          value={s.auto_dispatched}
          subtitle={pct(s.auto_dispatched, s.total_decisions)}
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
        />
        <SummaryCard
          title="Escalated"
          value={s.escalated}
          subtitle={pct(s.escalated, s.total_decisions)}
          icon={<TrendingDown className="h-4 w-4 text-yellow-500" />}
        />
        <SummaryCard
          title="Monthly Spend"
          value={`$${s.total_spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title="Override Rate"
          value={pct(s.overridden, s.total_decisions)}
          description={`${s.overridden} of ${s.total_decisions} decisions overridden`}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricCard
          title="Trust Score"
          value={
            s.trust_score !== null
              ? `${Math.round(s.trust_score * 100)}%`
              : "N/A"
          }
          valueClassName={trustColor(s.trust_score)}
          description="Based on override rate"
          icon={<Brain className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg. Confidence"
          value={
            avgConfidence !== null
              ? `${Math.round(avgConfidence * 100)}%`
              : "N/A"
          }
          description="Average confidence of all decisions"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Spend by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by Category</CardTitle>
            <CardDescription>
              Total spend broken down by maintenance category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {spendByCategory.length > 0 ? (
              <ChartContainer
                config={buildCategoryChartConfig(spendByCategory)}
                className="mx-auto aspect-square max-h-[280px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        }
                      />
                    }
                  />
                  <Pie
                    data={spendByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {spendByCategory.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyChart message="No spend data for this month" />
            )}
          </CardContent>
        </Card>

        {/* Decisions by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decisions by Category</CardTitle>
            <CardDescription>
              Number of decisions per maintenance category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {decisionsByCategory.length > 0 ? (
              <ChartContainer
                config={buildCategoryChartConfig(decisionsByCategory)}
                className="max-h-[280px]"
              >
                <BarChart
                  data={decisionsByCategory}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickFormatter={(v: string) =>
                      v.charAt(0).toUpperCase() + v.slice(1)
                    }
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={4}>
                    {decisionsByCategory.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart message="No decision data for this month" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confidence Distribution</CardTitle>
          <CardDescription>
            How decision confidence scores are distributed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confidenceDistribution.some((b) => b.count > 0) ? (
            <ChartContainer
              config={confidenceChartConfig}
              className="max-h-[240px]"
            >
              <BarChart data={confidenceDistribution}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="range" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={4}>
                  {confidenceDistribution.map((entry, i) => (
                    <Cell key={entry.range} fill={CONFIDENCE_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart message="No confidence data for this month" />
          )}
        </CardContent>
      </Card>

      {/* AI Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI Recommendation
          </CardTitle>
          <CardDescription>
            Performance-based suggestions for your autonomy settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : recommendation ? (
            <p className="text-sm leading-relaxed text-foreground">
              {recommendation}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recommendation available for this month.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  valueClassName,
  description,
  icon,
}: {
  title: string;
  value: string;
  valueClassName?: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
        <p className={`mt-2 text-2xl font-bold tabular-nums ${valueClassName ?? ""}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Data Computation Helpers ─────────────────────────────────────────────────

function computeSpendByCategory(decisions: AutonomousDecision[]): CategoryData[] {
  const map: Record<string, number> = {};
  for (const d of decisions) {
    const cat = extractCategory(d);
    const cost = extractCost(d);
    map[cat] = (map[cat] ?? 0) + cost;
  }
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: CATEGORY_COLORS[name] ?? CATEGORY_COLORS.general,
    }))
    .sort((a, b) => b.value - a.value);
}

function computeDecisionsByCategory(
  decisions: AutonomousDecision[]
): CategoryData[] {
  const map: Record<string, number> = {};
  for (const d of decisions) {
    const cat = extractCategory(d);
    map[cat] = (map[cat] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({
      name,
      value,
      fill: CATEGORY_COLORS[name] ?? CATEGORY_COLORS.general,
    }))
    .sort((a, b) => b.value - a.value);
}

function computeConfidenceDistribution(
  decisions: AutonomousDecision[]
): ConfidenceBucket[] {
  const buckets = [0, 0, 0, 0];
  for (const d of decisions) {
    const c = d.confidence_score;
    if (c < 0.5) buckets[0]++;
    else if (c < 0.7) buckets[1]++;
    else if (c < 0.85) buckets[2]++;
    else buckets[3]++;
  }
  return [
    { range: "0-0.5", count: buckets[0], fill: CONFIDENCE_COLORS[0] },
    { range: "0.5-0.7", count: buckets[1], fill: CONFIDENCE_COLORS[1] },
    { range: "0.7-0.85", count: buckets[2], fill: CONFIDENCE_COLORS[2] },
    { range: "0.85-1.0", count: buckets[3], fill: CONFIDENCE_COLORS[3] },
  ];
}

function computeAvgConfidence(decisions: AutonomousDecision[]): number | null {
  if (decisions.length === 0) return null;
  const sum = decisions.reduce((acc, d) => acc + d.confidence_score, 0);
  return sum / decisions.length;
}

function buildRecommendation(stats: MonthlyStats): string {
  const { total_decisions, overridden, trust_score, auto_dispatched, escalated, total_spend } = stats;

  if (total_decisions === 0) {
    return "No autonomous decisions were made this month. Consider enabling autopilot or lowering your confidence threshold to let the AI assist with more routine maintenance requests.";
  }

  const parts: string[] = [];

  // Trust score assessment
  if (trust_score !== null) {
    if (trust_score >= 0.9) {
      parts.push(
        "Your trust score is excellent — the AI is making decisions that align well with your preferences."
      );
    } else if (trust_score >= 0.7) {
      parts.push(
        "Your trust score is good. A few decisions were overridden, which helps the AI learn your preferences."
      );
    } else {
      parts.push(
        "Your trust score indicates frequent overrides. Consider reviewing your autonomy settings or increasing the confidence threshold."
      );
    }
  }

  // Actionable suggestion
  if (overridden === 0 && total_decisions > 5) {
    parts.push(
      "With zero overrides, you could consider increasing the confidence threshold to 0.90 for faster autonomous handling."
    );
  } else if (escalated > auto_dispatched) {
    parts.push(
      "Most decisions were escalated rather than auto-dispatched. Lowering your confidence threshold slightly could reduce manual reviews."
    );
  }

  if (total_spend > 5000) {
    parts.push(
      `Monthly spend of $${total_spend.toLocaleString()} is significant — review vendor costs for optimization opportunities.`
    );
  }

  return parts.join(" ") || "Performance looks on track. Keep monitoring your override rate to fine-tune autonomy settings.";
}
