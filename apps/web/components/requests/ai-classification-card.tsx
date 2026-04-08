import {
  Droplets,
  Zap,
  Thermometer,
  Landmark,
  Bug,
  Refrigerator,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UrgencyBadge } from "@/components/requests/urgency-badge";

const categoryIcons: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Thermometer,
  structural: Landmark,
  pest: Bug,
  appliance: Refrigerator,
  general: Wrench,
};

interface AiClassificationCardProps {
  category: string;
  urgency: "low" | "medium" | "emergency";
  confidenceScore: number;
  recommendedAction: string;
}

export function AiClassificationCard({
  category,
  urgency,
  confidenceScore,
  recommendedAction,
}: AiClassificationCardProps) {
  const Icon = categoryIcons[category] ?? Wrench;
  const confidencePct = Math.round(confidenceScore * 100);

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold">AI Classification</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm capitalize font-medium">{category}</span>
        </div>

        <UrgencyBadge urgency={urgency} />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">AI Confidence</span>
            <span className="font-medium tabular-nums">{confidencePct}%</span>
          </div>
          <Progress value={confidencePct} />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Recommended action</p>
          <p className="text-sm">{recommendedAction}</p>
        </div>
      </CardContent>
    </Card>
  );
}
