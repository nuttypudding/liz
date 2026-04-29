"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PropertyFinancials {
  property_id: string;
  property_name: string;
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;
  maintenance_costs: number;
  net_income: number;
}

interface FinancialSummary {
  month: number;
  year: number;
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;
  maintenance_costs: number;
  vendor_payments_total: number;
  net_income: number;
  properties: PropertyFinancials[];
}

interface ChartData {
  month: string;
  rent_collected: number;
  maintenance_costs: number;
}

interface FinancialSummarySectionProps {
  month: number;
  year?: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2024, i, 1).toLocaleDateString("en-US", { month: "long" }),
}));

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

export function FinancialSummarySection({
  month,
  year,
}: FinancialSummarySectionProps) {
  const currentYear = year ?? new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(String(month));
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/payments/summary?month=${selectedMonth}&year=${currentYear}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          setSummary(null);
          return;
        }
        throw new Error("Failed to fetch summary");
      }

      const data: FinancialSummary = await res.json();
      setSummary(data);
    } catch {
      toast.error("Failed to load financial summary.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, currentYear]);

  // Fetch historical data for chart (past 6 months)
  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const months: ChartData[] = [];
      const today = new Date();

      for (let i = 5; i >= 0; i--) {
        let m = today.getMonth() + 1 - i;
        let y = today.getFullYear();
        if (m <= 0) {
          m += 12;
          y -= 1;
        }

        const res = await fetch(`/api/payments/summary?month=${m}&year=${y}`);
        if (res.ok) {
          const data: FinancialSummary = await res.json();
          const monthName = new Date(y, m - 1).toLocaleDateString("en-US", {
            month: "short",
          });
          months.push({
            month: monthName,
            rent_collected: data.rent_collected,
            maintenance_costs: data.maintenance_costs,
          });
        }
      }

      setChartData(months);
    } catch {
      console.error("Error fetching chart data");
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Month</label>
        <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <SummarySkeleton />
      ) : (
        <>
          {/* P&L Summary Cards */}
          {summary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
                  <DollarSign className="size-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Rent Collected
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-3xl font-bold text-green-600">
                    ${formatCurrency(summary.rent_collected)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.collection_rate}% collection rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
                  <TrendingDown className="size-4 text-red-600 shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Maintenance Costs
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-3xl font-bold text-red-600">
                    ${formatCurrency(summary.maintenance_costs)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vendor &amp; contractor payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
                  <TrendingUp className="size-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Net Income
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p
                    className={`text-3xl font-bold ${
                      summary.net_income >= 0 ? "text-blue-600" : "text-red-600"
                    }`}
                  >
                    ${formatCurrency(summary.net_income)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Collected minus costs
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No financial data available for this period.
              </CardContent>
            </Card>
          )}

          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-[300px] w-full rounded-lg" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value) => `$${formatCurrency(Number(value))}`}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="rent_collected"
                      stackId="a"
                      fill="#10b981"
                      name="Rent Collected"
                    />
                    <Bar
                      dataKey="maintenance_costs"
                      stackId="a"
                      fill="#ef4444"
                      name="Costs"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No chart data available.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Property Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Property Breakdown (
                {MONTHS[parseInt(selectedMonth) - 1]?.label ?? selectedMonth})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary && summary.properties.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Rent Collected</TableHead>
                      <TableHead>Costs</TableHead>
                      <TableHead>Net Income</TableHead>
                      <TableHead>Collection %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.properties.map((property) => (
                      <TableRow key={property.property_id}>
                        <TableCell className="font-medium">
                          {property.property_name}
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          ${formatCurrency(property.rent_collected)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          ${formatCurrency(property.maintenance_costs)}
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${
                            property.net_income >= 0
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        >
                          ${formatCurrency(property.net_income)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              property.collection_rate >= 90
                                ? "bg-green-600 hover:bg-green-600 text-white"
                                : property.collection_rate >= 70
                                  ? "bg-yellow-600 hover:bg-yellow-600 text-white"
                                  : "bg-red-600 hover:bg-red-600 text-white"
                            }
                          >
                            {property.collection_rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No property data available.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
