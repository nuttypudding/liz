"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { VendorForm } from "@/components/forms/vendor-form";
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

type SheetMode =
  | { type: "add" }
  | { type: "edit"; vendor: Vendor }
  | null;

interface VendorFormData {
  name: string;
  phone: string;
  email: string;
  specialty: string;
  notes: string;
}

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
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="flex flex-col">
              <CardHeader className="px-4 pt-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-semibold leading-snug">
                      {vendor.name}
                    </h3>
                    <Badge variant="secondary">
                      {SPECIALTY_LABELS[vendor.specialty] ?? vendor.specialty}
                    </Badge>
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
                      {vendor.phone}
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
          ))}
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
          {sheetMode !== null && (
            <VendorForm
              initialData={
                sheetMode.type === "edit" ? sheetMode.vendor : undefined
              }
              onSave={handleSave}
              onCancel={() => setSheetMode(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
