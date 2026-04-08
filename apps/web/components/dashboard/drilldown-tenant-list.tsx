"use client";

import { useState } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { TenantForm, type TenantFormData } from "@/components/forms/tenant-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type { Tenant } from "@/lib/types";

type SheetMode =
  | { type: "add" }
  | { type: "edit"; tenant: Tenant }
  | null;

interface DrilldownTenantListProps {
  propertyId: string;
  tenants: Tenant[];
  onRefresh: () => void;
}

export function DrilldownTenantList({
  propertyId,
  tenants,
  onRefresh,
}: DrilldownTenantListProps) {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);

  async function handleSave(data: TenantFormData) {
    const payload = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      move_in_date: data.move_in_date || null,
      lease_type: data.lease_type || null,
      rent_due_day: data.rent_due_day ? Number(data.rent_due_day) : null,
      custom_fields:
        Object.keys(data.custom_fields).length > 0 ? data.custom_fields : null,
    };

    if (sheetMode?.type === "add") {
      const res = await fetch(`/api/properties/${propertyId}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Tenant added");
        onRefresh();
      } else {
        toast.error("Failed to add tenant");
      }
    } else if (sheetMode?.type === "edit") {
      const res = await fetch(`/api/tenants/${sheetMode.tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Tenant updated");
        onRefresh();
      } else {
        toast.error("Failed to update tenant");
      }
    }
    setSheetMode(null);
  }

  async function handleDelete(tenantId: string) {
    const res = await fetch(`/api/tenants/${tenantId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Tenant removed");
      onRefresh();
    } else {
      toast.error("Failed to remove tenant");
    }
  }

  return (
    <>
      <div className="space-y-3">
        {tenants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <User className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No tenants yet.</p>
            </CardContent>
          </Card>
        ) : (
          tenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onEdit={() => setSheetMode({ type: "edit", tenant })}
              onDelete={() => handleDelete(tenant.id)}
            />
          ))
        )}

        <Button
          variant="outline"
          className="w-full min-h-11"
          onClick={() => setSheetMode({ type: "add" })}
        >
          <Plus className="size-4" />
          Add Tenant
        </Button>
      </div>

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) setSheetMode(null);
        }}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {sheetMode?.type === "add" ? "Add Tenant" : "Edit Tenant"}
            </SheetTitle>
          </SheetHeader>
          {sheetMode !== null && (
            <TenantForm
              initialData={
                sheetMode.type === "edit" ? sheetMode.tenant : undefined
              }
              onSave={handleSave}
              onCancel={() => setSheetMode(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function TenantCard({
  tenant,
  onEdit,
  onDelete,
}: {
  tenant: Tenant;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const moveInLabel = tenant.move_in_date
    ? new Date(tenant.move_in_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{tenant.name}</span>
          </div>
          {tenant.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{tenant.email}</span>
            </div>
          )}
          {tenant.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3 shrink-0" />
              <span>{tenant.phone}</span>
            </div>
          )}
          {moveInLabel && (
            <p className="text-xs text-muted-foreground">
              Move-in: {moveInLabel}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 min-w-11"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "min-h-11 min-w-11 text-destructive hover:text-destructive"
              )}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">Remove</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {tenant.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the tenant from the property.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
