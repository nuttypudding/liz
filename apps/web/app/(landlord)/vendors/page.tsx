"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Mail, Pencil, Phone, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { VendorForm } from "@/components/forms/vendor-form";
import type { VendorFormData } from "@/components/forms/vendor-form";
import { AvailabilityTab } from "@/components/vendors/AvailabilityTab";
import { AvailabilityBadge } from "@/components/vendors/AvailabilityBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Vendor } from "@/lib/types";

const SPECIALTY_LABELS: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  structural: "Structural",
  pest: "Pest Control",
  appliance: "Appliance",
  general: "General",
};

const RANK_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type SheetMode =
  | { type: "add" }
  | { type: "edit"; vendor: Vendor }
  | null;

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const { vendors: data } = await res.json();
        setVendors(data ?? []);
      }
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  async function handleSave(data: VendorFormData) {
    if (sheetMode?.type === "add") {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Vendor added");
        await fetchVendors();
      } else {
        toast.error("Failed to add vendor");
      }
    } else if (sheetMode?.type === "edit") {
      const res = await fetch(`/api/vendors/${sheetMode.vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Vendor updated");
        await fetchVendors();
      } else {
        toast.error("Failed to update vendor");
      }
    }
    setSheetMode(null);
  }

  async function handleDelete(vendorId: string) {
    const res = await fetch(`/api/vendors/${vendorId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Vendor removed");
      await fetchVendors();
    } else {
      toast.error("Failed to remove vendor");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Vendors"
          action={
            <Button disabled className="min-h-11">
              <Plus className="size-4" />
              Add Vendor
            </Button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendors"
        action={
          <Button
            onClick={() => setSheetMode({ type: "add" })}
            className="min-h-11"
          >
            <Plus className="size-4" />
            Add Vendor
          </Button>
        }
      />

      {vendors.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No vendors yet"
          description="Add your first vendor to assign them to maintenance requests."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => {
            const customFieldCount = vendor.custom_fields
              ? Object.keys(vendor.custom_fields).length
              : 0;

            return (
              <Card key={vendor.id} className="flex flex-col relative">
                <div className="absolute top-3 right-3">
                  <AvailabilityBadge vendorId={vendor.id} />
                </div>
                <CardHeader className="px-4 pt-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-semibold leading-snug">
                        {vendor.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary">
                          {SPECIALTY_LABELS[vendor.specialty] ?? vendor.specialty}
                        </Badge>
                        {vendor.priority_rank > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {RANK_LABELS[vendor.priority_rank] ?? `#${vendor.priority_rank}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-3 space-y-1.5 flex-1">
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="size-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${vendor.phone}`}
                        className="hover:underline"
                      >
                        {formatPhoneDisplay(vendor.phone)}
                      </a>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="size-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`mailto:${vendor.email}`}
                        className="hover:underline truncate"
                      >
                        {vendor.email}
                      </a>
                    </div>
                  )}
                  {vendor.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                      {vendor.notes}
                    </p>
                  )}
                  {customFieldCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <FileText className="size-3 shrink-0" />
                      {customFieldCount} custom field{customFieldCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="px-4 pb-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9"
                    onClick={() => setSheetMode({ type: "edit", vendor })}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-9 text-destructive hover:text-destructive border-destructive/30" })}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove {vendor.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This vendor will be removed from your account. This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(vendor.id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) setSheetMode(null);
        }}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {sheetMode?.type === "add" ? "Add Vendor" : "Edit Vendor"}
            </SheetTitle>
          </SheetHeader>
          {sheetMode !== null && sheetMode.type === "add" && (
            <VendorForm
              onSave={handleSave}
              onCancel={() => setSheetMode(null)}
            />
          )}
          {sheetMode !== null && sheetMode.type === "edit" && (
            <Tabs defaultValue="info">
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="info">Basic Info</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>
              <TabsContent value="info">
                <VendorForm
                  initialData={sheetMode.vendor}
                  onSave={handleSave}
                  onCancel={() => setSheetMode(null)}
                />
              </TabsContent>
              <TabsContent value="availability">
                <AvailabilityTab vendorId={sheetMode.vendor.id} />
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
