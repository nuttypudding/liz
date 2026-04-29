"use client";

import { Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vendor } from "@/lib/types";

interface VendorSelectorProps {
  category: string;
  vendors: Vendor[];
  selectedVendorId: string;
  onVendorChange: (vendorId: string) => void;
}

export function VendorSelector({
  category,
  vendors,
  selectedVendorId,
  onVendorChange,
}: VendorSelectorProps) {
  const eligible = vendors.filter(
    (v) => v.specialty === category || category === "general"
  );

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold">Select Vendor</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <Select value={selectedVendorId} onValueChange={(v) => { if (v) onVendorChange(v); }}>
          <SelectTrigger className="w-full h-11">
            <SelectValue placeholder="Choose a vendor..." />
          </SelectTrigger>
          <SelectContent>
            {eligible.length === 0 ? (
              <SelectItem value="none" disabled>
                No vendors for this category
              </SelectItem>
            ) : (
              eligible.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {selectedVendor && (
          <div className="space-y-1.5 pt-1">
            {selectedVendor.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`tel:${selectedVendor.phone}`}
                  className="hover:underline"
                >
                  {selectedVendor.phone}
                </a>
              </div>
            )}
            {selectedVendor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`mailto:${selectedVendor.email}`}
                  className="hover:underline truncate"
                >
                  {selectedVendor.email}
                </a>
              </div>
            )}
            {selectedVendor.notes && (
              <p className="text-xs text-muted-foreground pt-1">
                {selectedVendor.notes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
