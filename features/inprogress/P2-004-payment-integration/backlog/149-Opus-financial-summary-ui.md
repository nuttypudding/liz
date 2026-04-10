---
id: 149
title: Build financial summary UI — P&L cards, trend chart, property breakdown
tier: Opus
depends_on: [146, 148]
feature: P2-004-payment-integration
---

# 149 — Build financial summary UI — P&L cards, trend chart, property breakdown

## Objective
Build the **Financial Summary** tab component that displays:
1. **PLSummaryCards** — 3 cards: Rent Collected, Maintenance Costs, Net Income
2. **MonthlyTrendChart** — Stacked bar chart (Recharts) showing rent/maintenance over past 6 months
3. **PropertyBreakdownTable** — Table with per-property P&L (rent collected, costs, net)
4. **Period Selector** — Dropdown to view different months

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

The Financial Summary tab is embedded in the landlord dashboard (task 148). This task focuses on building the UI component and integrating it with the financial summary API (task 146).

## Implementation

**File**: `apps/web/components/payments/financial-summary-section.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface PropertyFinancials {
  property_id: string;
  property_name: string;
  rent_collected: number;
  maintenance_costs: number;
  net_income: number;
  collection_rate: number;
}

interface FinancialSummary {
  month: number;
  year: number;
  rent_collected: number;
  maintenance_costs: number;
  net_income: number;
  collection_rate: number;
  properties: PropertyFinancials[];
}

interface ChartData {
  month: string;
  rent_collected: number;
  maintenance_costs: number;
}

interface FinancialSummarySectionProps {
  month: number;
}

export function FinancialSummarySection({ month }: FinancialSummarySectionProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [loading, setLoading] = useState(true);

  // Fetch financial summary
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const year = new Date().getFullYear();
        const res = await fetch(
          `/api/payments/summary?month=${selectedMonth}&year=${year}`
        );

        if (!res.ok) throw new Error('Failed to fetch summary');
        const data: FinancialSummary = await res.json();
        setSummary(data);
      } catch (error) {
        console.error('Error fetching financial summary:', error);
        toast({
          title: 'Error',
          description: 'Failed to load financial summary.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [selectedMonth, toast]);

  // Fetch historical data for chart (past 6 months)
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const months: ChartData[] = [];
        const today = new Date();
        const currentYear = today.getFullYear();

        for (let i = 5; i >= 0; i--) {
          let month = today.getMonth() - i + 1;
          let year = currentYear;

          if (month <= 0) {
            month += 12;
            year -= 1;
          }

          const res = await fetch(
            `/api/payments/summary?month=${month}&year=${year}`
          );
          if (res.ok) {
            const data: FinancialSummary = await res.json();
            const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
              month: 'short',
            });
            months.push({
              month: monthName,
              rent_collected: data.rent_collected,
              maintenance_costs: data.maintenance_costs,
            });
          }
        }

        setChartData(months);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    fetchChartData();
  }, []);

  const getMonthName = (monthNum: number) => {
    return new Date(2024, monthNum - 1).toLocaleDateString('en-US', { month: 'long' });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center gap-4">
        <label className="font-medium text-sm">Select Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="border rounded px-3 py-2"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {getMonthName(i + 1)}
            </option>
          ))}
        </select>
      </div>

      {/* P&L Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rent Collected</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${summary.rent_collected.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {summary.collection_rate}% collection rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Costs</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${summary.maintenance_costs.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Vendor & contractor payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  summary.net_income >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                ${summary.net_income.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Collected minus costs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${value.toFixed(2)}`}
                  labelFormatter={(label: any) => `Month: ${label}`}
                />
                <Legend />
                <Bar dataKey="rent_collected" stackId="a" fill="#10b981" name="Rent Collected" />
                <Bar dataKey="maintenance_costs" stackId="a" fill="#ef4444" name="Costs" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-600 text-center py-8">No chart data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Property Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Property Breakdown ({getMonthName(selectedMonth)})</CardTitle>
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
                    <TableCell className="font-medium">{property.property_name}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      ${property.rent_collected.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-red-600">
                      ${property.maintenance_costs.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`font-semibold ${
                        property.net_income >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      ${property.net_income.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          property.collection_rate >= 90
                            ? 'bg-green-600'
                            : property.collection_rate >= 70
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
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
            <p className="text-gray-600 text-center py-8">No property data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] Component created: `apps/web/components/payments/financial-summary-section.tsx`
2. [ ] Accepts `month` prop from parent (dashboard)
3. [ ] Displays PLSummaryCards with:
   - [ ] Rent Collected (green)
   - [ ] Maintenance Costs (red)
   - [ ] Net Income (blue or red depending on sign)
4. [ ] Month selector dropdown to change viewed month
5. [ ] MonthlyTrendChart using Recharts:
   - [ ] Shows past 6 months
   - [ ] Stacked bar chart (rent/costs)
   - [ ] Proper legend and tooltip
6. [ ] PropertyBreakdownTable with:
   - [ ] Property name
   - [ ] Rent Collected, Maintenance Costs, Net Income
   - [ ] Collection Rate badge (green ≥90%, yellow ≥70%, red <70%)
7. [ ] Fetches data from /api/payments/summary
8. [ ] Handles loading state
9. [ ] Handles errors with toast
10. [ ] Responsive layout (1 col mobile, 3 cols desktop)
11. [ ] All monetary values formatted to 2 decimal places
12. [ ] Colors consistent with design system
13. [ ] No TypeScript errors
14. [ ] Uses project UI components (Card, Table, Badge)
