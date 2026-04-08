"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, ChevronDown, Pencil, Phone, Mail, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PropertyForm } from "@/components/forms/property-form";
import { TenantForm, type TenantFormData } from "@/components/forms/tenant-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { Property, Tenant } from "@/lib/types";

type SheetMode =
  | { type: "add-property" }
  | { type: "edit-property"; property: Property }
  | { type: "add-tenant"; propertyId: string }
  | { type: "edit-tenant"; propertyId: string; tenant: Tenant }
  | null;

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCollapsibles, setOpenCollapsibles] = useState<Set<string>>(
    new Set()
  );
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch("/api/properties");
      if (res.ok) {
        const { properties: data } = await res.json();
        setProperties(data ?? []);
      }
    } catch {
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  function toggleCollapsible(id: string) {
    setOpenCollapsibles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSaveProperty(data: {
    name: string;
    address: string;
    apt_or_unit_no: string;
    unit_count: number;
    monthly_rent: number;
  }) {
    if (sheetMode?.type === "add-property") {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Property added");
        await fetchProperties();
      } else {
        toast.error("Failed to add property");
      }
    } else if (sheetMode?.type === "edit-property") {
      const res = await fetch(`/api/properties/${sheetMode.property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Property updated");
        await fetchProperties();
      } else {
        toast.error("Failed to update property");
      }
    }
    setSheetMode(null);
  }

  async function handleDeleteProperty(propertyId: string) {
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "DELETE",
    });
    if (res.ok || res.status === 204) {
      toast.success("Property removed");
      await fetchProperties();
    } else {
      toast.error("Failed to remove property");
    }
  }

  async function handleSaveTenant(data: TenantFormData) {
    const payload = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      move_in_date: data.move_in_date || null,
      lease_type: data.lease_type || null,
      rent_due_day: data.rent_due_day ? Number(data.rent_due_day) : null,
      custom_fields: Object.keys(data.custom_fields).length > 0 ? data.custom_fields : null,
    };

    if (sheetMode?.type === "add-tenant") {
      const res = await fetch(`/api/properties/${sheetMode.propertyId}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Tenant added");
        await fetchProperties();
      } else {
        toast.error("Failed to add tenant");
      }
    } else if (sheetMode?.type === "edit-tenant") {
      const res = await fetch(`/api/tenants/${sheetMode.tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Tenant updated");
        await fetchProperties();
      } else {
        toast.error("Failed to update tenant");
      }
    }
    setSheetMode(null);
  }

  async function handleDeleteTenant(tenantId: string) {
    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: "DELETE",
    });
    if (res.ok || res.status === 204) {
      toast.success("Tenant removed");
      await fetchProperties();
    } else {
      toast.error("Failed to remove tenant");
    }
  }

  const sheetTitle =
    sheetMode?.type === "add-property"
      ? "Add Property"
      : sheetMode?.type === "edit-property"
        ? "Edit Property"
        : sheetMode?.type === "add-tenant"
          ? "Add Tenant"
          : sheetMode?.type === "edit-tenant"
            ? "Edit Tenant"
            : "";

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Properties"
          action={
            <Button disabled className="min-h-11">
              <Plus className="size-4" />
              Add Property
            </Button>
          }
        />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Properties"
        action={
          <Button
            onClick={() => setSheetMode({ type: "add-property" })}
            className="min-h-11"
          >
            <Plus className="size-4" />
            Add Property
          </Button>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start managing maintenance requests."
        />
      ) : (
        <div className="space-y-3">
          {properties.map((property) => {
            const isOpen = openCollapsibles.has(property.id);
            const tenants = property.tenants ?? [];
            return (
              <Card key={property.id}>
                <CardHeader className="px-4 pt-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold">
                          {property.name}
                        </h3>
                        <Badge variant="secondary">
                          {property.unit_count ?? 0} units
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {property.address}
                        {property.apt_or_unit_no && ` — ${property.apt_or_unit_no}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-9"
                        onClick={() =>
                          setSheetMode({ type: "edit-property", property })
                        }
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-9 text-destructive hover:text-destructive")}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {property.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the property and all its tenants
                              from your account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteProperty(property.id)
                              }
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4">
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleCollapsible(property.id)}
                  >
                    <CollapsibleTrigger
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-between min-h-9 -mx-1 px-1")}
                    >
                        <span className="text-sm text-muted-foreground">
                          {tenants.length} tenant
                          {tenants.length !== 1 ? "s" : ""}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="space-y-2">
                        {tenants.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">
                            No tenants yet.
                          </p>
                        ) : (
                          tenants.map((tenant) => (
                            <div
                              key={tenant.id}
                              className="flex items-start justify-between gap-2 rounded-lg border p-3"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <User className="size-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium">
                                    {tenant.name}
                                  </span>
                                  {tenant.unit_number && (
                                    <Badge variant="outline" className="text-xs">
                                      Unit {tenant.unit_number}
                                    </Badge>
                                  )}
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
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-9"
                                  onClick={() =>
                                    setSheetMode({
                                      type: "edit-tenant",
                                      propertyId: property.id,
                                      tenant,
                                    })
                                  }
                                >
                                  <Pencil className="size-3.5" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-9 text-destructive hover:text-destructive")}
                                  >
                                    <Trash2 className="size-3.5" />
                                    <span className="sr-only">Remove</span>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Remove {tenant.name}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove the tenant from the
                                        property.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleDeleteTenant(tenant.id)
                                        }
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full min-h-9 text-muted-foreground"
                          onClick={() =>
                            setSheetMode({
                              type: "add-tenant",
                              propertyId: property.id,
                            })
                          }
                        >
                          <Plus className="size-4" />
                          Add Tenant
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetMode !== null} onOpenChange={(open) => { if (!open) setSheetMode(null); }}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          {(sheetMode?.type === "add-property" ||
            sheetMode?.type === "edit-property") && (
            <PropertyForm
              initialData={
                sheetMode.type === "edit-property"
                  ? sheetMode.property
                  : undefined
              }
              onSave={handleSaveProperty}
              onCancel={() => setSheetMode(null)}
            />
          )}
          {(sheetMode?.type === "add-tenant" ||
            sheetMode?.type === "edit-tenant") && (
            <TenantForm
              initialData={
                sheetMode.type === "edit-tenant" ? sheetMode.tenant : undefined
              }
              onSave={handleSaveTenant}
              onCancel={() => setSheetMode(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
