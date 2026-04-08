"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { Property } from "@/lib/types";

interface PropertyFormData {
  name: string;
  address: string;
  unit_count: number;
  monthly_rent: number;
}

interface PropertyFormProps {
  initialData?: Partial<Property>;
  onSave: (data: PropertyFormData) => void;
  onCancel: () => void;
}

export function PropertyForm({
  initialData,
  onSave,
  onCancel,
}: PropertyFormProps) {
  const [form, setForm] = useState<PropertyFormData>({
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    unit_count: initialData?.unit_count ?? 1,
    monthly_rent: initialData?.monthly_rent ?? 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="prop-name">Property Name</Label>
        <Input
          id="prop-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="123 Oak Street"
          required
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prop-address">Address</Label>
        <Input
          id="prop-address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="123 Oak Street, Austin TX 78701"
          required
          className="min-h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prop-units">Unit Count</Label>
          <Input
            id="prop-units"
            type="number"
            min={1}
            value={form.unit_count}
            onChange={(e) =>
              setForm({ ...form, unit_count: Number(e.target.value) })
            }
            required
            className="min-h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prop-rent">Monthly Rent ($)</Label>
          <Input
            id="prop-rent"
            type="number"
            min={0}
            value={form.monthly_rent}
            onChange={(e) =>
              setForm({ ...form, monthly_rent: Number(e.target.value) })
            }
            required
            className="min-h-11"
          />
        </div>
      </div>

      <SheetFooter className="px-0 mt-2">
        <Button type="submit" className="min-h-11">
          Save Property
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="min-h-11"
        >
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
