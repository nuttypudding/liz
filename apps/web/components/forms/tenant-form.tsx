"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { Tenant } from "@/lib/types";

interface TenantFormData {
  name: string;
  email: string;
  phone: string;
  unit_number: string;
}

interface TenantFormProps {
  initialData?: Partial<Tenant>;
  onSave: (data: TenantFormData) => void;
  onCancel: () => void;
}

export function TenantForm({ initialData, onSave, onCancel }: TenantFormProps) {
  const [form, setForm] = useState<TenantFormData>({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    unit_number: initialData?.unit_number ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="tenant-name">Full Name</Label>
        <Input
          id="tenant-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Jane Smith"
          required
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tenant-email">Email</Label>
        <Input
          id="tenant-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="jane@example.com"
          required
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tenant-phone">Phone</Label>
        <Input
          id="tenant-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="512-555-0100"
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tenant-unit">Unit Number</Label>
        <Input
          id="tenant-unit"
          value={form.unit_number}
          onChange={(e) => setForm({ ...form, unit_number: e.target.value })}
          placeholder="1A"
          required
          className="min-h-11"
        />
      </div>

      <SheetFooter className="px-0 mt-2">
        <Button type="submit" className="min-h-11">
          Save Tenant
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
