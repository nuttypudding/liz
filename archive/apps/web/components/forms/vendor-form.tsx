"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";
import { PhoneInput } from "@/components/ui/phone-input";
import { CustomFields } from "@/components/ui/custom-fields";
import type { Vendor } from "@/lib/types";

const SPECIALTIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "structural", label: "Structural" },
  { value: "pest", label: "Pest Control" },
  { value: "appliance", label: "Appliance" },
  { value: "general", label: "General" },
] as const;

type Specialty = (typeof SPECIALTIES)[number]["value"];

const RANK_OPTIONS = [
  { value: "0", label: "Unranked" },
  { value: "1", label: "1st — Preferred" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
] as const;

export interface VendorFormData {
  name: string;
  phone: string;
  email: string;
  specialty: string;
  notes: string;
  priority_rank: number;
  custom_fields: Record<string, string>;
}

interface VendorFormProps {
  initialData?: Partial<Vendor>;
  onSave: (data: VendorFormData) => void;
  onCancel: () => void;
}

export function VendorForm({ initialData, onSave, onCancel }: VendorFormProps) {
  const [form, setForm] = useState<VendorFormData>({
    name: initialData?.name ?? "",
    phone: initialData?.phone ?? "",
    email: initialData?.email ?? "",
    specialty: (initialData?.specialty as Specialty) ?? "general",
    notes: initialData?.notes ?? "",
    priority_rank: initialData?.priority_rank ?? 0,
    custom_fields: initialData?.custom_fields ?? {},
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="vendor-name">Business Name</Label>
        <Input
          id="vendor-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="FastFix Plumbing"
          required
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vendor-phone">Phone</Label>
        <PhoneInput
          id="vendor-phone"
          value={form.phone}
          onValueChange={(digits) => setForm({ ...form, phone: digits })}
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vendor-email">Email</Label>
        <Input
          id="vendor-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="info@vendor.com"
          className="min-h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="vendor-specialty">Specialty</Label>
          <Select
            value={form.specialty}
            onValueChange={(v) => setForm({ ...form, specialty: v as Specialty })}
          >
            <SelectTrigger id="vendor-specialty" className="w-full min-h-11">
              <SelectValue placeholder="Select specialty" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vendor-rank">Rank</Label>
          <Select
            value={String(form.priority_rank)}
            onValueChange={(v) =>
              setForm({ ...form, priority_rank: parseInt(v ?? "0", 10) })
            }
          >
            <SelectTrigger id="vendor-rank" className="w-full min-h-11">
              <SelectValue placeholder="Select rank" />
            </SelectTrigger>
            <SelectContent>
              {RANK_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vendor-notes">Notes</Label>
        <Textarea
          id="vendor-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Ask for Dave, usually available same-day..."
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Custom Fields</Label>
        <CustomFields
          value={form.custom_fields}
          onChange={(fields) => setForm({ ...form, custom_fields: fields })}
        />
      </div>

      <SheetFooter className="px-0 mt-2">
        <Button type="submit" className="min-h-11">
          Save Vendor
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
