"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Property {
  id: string;
  name: string;
}

interface LogVendorPaymentDialogProps {
  onSuccess?: () => void;
}

export function LogVendorPaymentDialog({
  onSuccess,
}: LogVendorPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [requestId, setRequestId] = useState("");

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && properties.length === 0) {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const data: Property[] = await res.json();
          setProperties(data);
          if (data.length > 0) setPropertyId(data[0].id);
        }
      } catch {
        console.error("Failed to fetch properties");
      }
    }
  };

  const resetForm = () => {
    setVendorName("");
    setAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setRequestId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId || !vendorName || !amount || !paymentDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/payments/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          vendor_name: vendorName,
          amount: parseFloat(amount),
          payment_date: paymentDate,
          description: description || undefined,
          request_id: requestId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to log payment");

      toast.success(`Vendor payment logged: ${vendorName} — $${amount}`);
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to log vendor payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            Log Payment
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Vendor Payment</DialogTitle>
          <DialogDescription>
            Record a payment to a contractor or vendor for maintenance work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vp-property">Property</Label>
            <Select value={propertyId} onValueChange={(v) => v && setPropertyId(v)}>
              <SelectTrigger id="vp-property">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vp-vendor">Vendor Name</Label>
            <Input
              id="vp-vendor"
              placeholder="e.g., John's Plumbing"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vp-amount">Amount ($)</Label>
            <Input
              id="vp-amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vp-date">Payment Date</Label>
            <Input
              id="vp-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vp-desc">Description (Optional)</Label>
            <Textarea
              id="vp-desc"
              placeholder="e.g., Fixed leaky kitchen faucet, replaced pipes under sink"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vp-request">
              Link to Maintenance Request (Optional)
            </Label>
            <Input
              id="vp-request"
              placeholder="Request ID"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if not linked to a specific request.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Logging..." : "Log Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
