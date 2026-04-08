import { AlertTriangle, Clock, DollarSign, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SectionCardsProps {
  emergencyCount: number;
  openCount: number;
  avgResolutionDays: number;
  monthlySpend: number;
}

export function SectionCards({
  emergencyCount,
  openCount,
  avgResolutionDays,
  monthlySpend,
}: SectionCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Emergencies
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold text-destructive">{emergencyCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <Wrench className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Open Requests
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold">{openCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <Clock className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Avg Resolution
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold">{avgResolutionDays}</p>
          <p className="text-xs text-muted-foreground">days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <DollarSign className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Monthly Spend
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold">
            ${monthlySpend.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
