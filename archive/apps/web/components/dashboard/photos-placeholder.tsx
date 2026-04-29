"use client";

import { Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PhotosPlaceholder() {
  const features = [
    "Property photos",
    "Move-in/out inspection photos",
    "Before/after maintenance photos",
  ];

  return (
    <Card>
      <CardContent className="px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Camera className="size-12 text-muted-foreground/50" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Property Photos
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              {features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </div>
          <span className="text-xs text-muted-foreground italic">
            Coming soon
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
