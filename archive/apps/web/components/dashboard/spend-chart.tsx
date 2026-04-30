"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SpendChartItem } from "@/lib/types";

const chartConfig: ChartConfig = {
  spend: {
    label: "Maintenance Spend",
    color: "hsl(var(--chart-1))",
  },
  rent: {
    label: "Monthly Rent",
    color: "hsl(var(--chart-2))",
  },
};

interface SpendChartProps {
  data: SpendChartItem[];
}

export function SpendChart({ data }: SpendChartProps) {
  const chartData = data.map((item) => ({
    property: item.property_name,
    spend: item.spend,
    rent: item.rent,
  }));

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-0">
        <p className="text-sm font-medium">Spend vs. Rent</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ChartContainer config={chartConfig} className="mt-3 h-64 w-full">
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="property"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number"
                      ? `$${value.toLocaleString()}`
                      : String(value)
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="spend"
              fill="var(--color-spend)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="rent"
              fill="var(--color-rent)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
