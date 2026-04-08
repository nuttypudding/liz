"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface WorkOrderDraftProps {
  requestId: string;
  defaultText: string;
  onTextChange?: (text: string) => void;
}

export function WorkOrderDraft({ requestId, defaultText, onTextChange }: WorkOrderDraftProps) {
  const [text, setText] = useState(defaultText);

  function handleChange(value: string) {
    setText(value);
    onTextChange?.(value);
  }

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold">Work Order Draft</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Label htmlFor={`work-order-${requestId}`} className="sr-only">
          Work order text
        </Label>
        <Textarea
          id={`work-order-${requestId}`}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          rows={6}
          className="resize-none text-sm"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Edit before sending to vendor
        </p>
      </CardContent>
    </Card>
  );
}
