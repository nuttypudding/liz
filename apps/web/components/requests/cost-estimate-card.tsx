import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CostEstimateCardProps {
  low: number;
  high: number;
}

export function CostEstimateCard({ low, high }: CostEstimateCardProps) {
  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold">Cost Estimate</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">
        <p className="text-2xl font-bold">
          ${low.toLocaleString()} &ndash; ${high.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          Based on typical market rates (AI Estimate)
        </p>
      </CardContent>
    </Card>
  );
}
