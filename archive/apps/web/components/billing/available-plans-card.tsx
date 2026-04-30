import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PlanTier {
  name: string;
  price: string;
  description: string;
}

const PLAN_TIERS: PlanTier[] = [
  {
    name: "Starter",
    price: "$19/mo",
    description: "10 properties, 100 requests/mo",
  },
  {
    name: "Pro",
    price: "$49/mo",
    description: "Unlimited properties + requests",
  },
];

export function AvailablePlansCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Plans</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {PLAN_TIERS.map((tier, index) => (
          <div key={tier.name}>
            {index > 0 && <Separator className="my-4" />}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{tier.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {tier.price}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tier.description}
                </p>
              </div>
              <Badge variant="outline">Coming soon</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
