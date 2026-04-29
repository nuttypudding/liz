"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApplicationSubmissionPayload,
  EmploymentStatus,
} from "@/lib/screening/types";

interface FormData extends ApplicationSubmissionPayload {
  agrees_to_background_check: boolean;
  agrees_to_terms: boolean;
}

export default function ApplicationPortal() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [step, setStep] = useState<"form" | "confirmation">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    property_id: propertyId,
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    employment_status: EmploymentStatus.EMPLOYED,
    employer_name: "",
    job_title: "",
    employment_duration_months: undefined,
    annual_income: undefined,
    monthly_rent_applying_for: 0,
    references: [],
    has_eviction_history: false,
    eviction_details: "",
    agrees_to_background_check: false,
    agrees_to_terms: false,
  });

  const [currentReference, setCurrentReference] = useState({
    name: "",
    phone: "",
    relationship: "landlord",
  });

  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddReference = () => {
    if (currentReference.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        references: [
          ...prev.references,
          {
            name: currentReference.name,
            phone: currentReference.phone,
            relationship: currentReference.relationship,
          },
        ],
      }));
      setCurrentReference({ name: "", phone: "", relationship: "landlord" });
    }
  };

  const handleRemoveReference = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.first_name.trim()) throw new Error("First name is required");
      if (!formData.last_name.trim()) throw new Error("Last name is required");
      if (!formData.email.trim()) throw new Error("Email is required");
      if (formData.monthly_rent_applying_for <= 0)
        throw new Error("Rent amount must be greater than 0");
      if (!formData.agrees_to_background_check)
        throw new Error("You must agree to background check");
      if (!formData.agrees_to_terms)
        throw new Error("You must agree to terms");

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit application");
      }

      const data = await res.json();
      setTrackingId(data.tracking_id);
      setStep("confirmation");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "confirmation" && trackingId) {
    return <ConfirmationPage trackingId={trackingId} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">
          Rental Application
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="First Name *"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                required
              />
              <Input
                placeholder="Last Name *"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                required
              />
              <Input
                placeholder="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
              <Input
                placeholder="Phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
              <Input
                placeholder="Date of Birth (YYYY-MM-DD)"
                type="date"
                value={formData.date_of_birth || ""}
                onChange={(e) => handleChange("date_of_birth", e.target.value)}
              />
            </div>
          </section>

          {/* Employment */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              Employment Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Employment Status *
                </label>
                <Select
                  value={formData.employment_status}
                  onValueChange={(value) =>
                    handleChange("employment_status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EmploymentStatus.EMPLOYED}>
                      Employed
                    </SelectItem>
                    <SelectItem value={EmploymentStatus.SELF_EMPLOYED}>
                      Self-Employed
                    </SelectItem>
                    <SelectItem value={EmploymentStatus.RETIRED}>
                      Retired
                    </SelectItem>
                    <SelectItem value={EmploymentStatus.STUDENT}>
                      Student
                    </SelectItem>
                    <SelectItem value={EmploymentStatus.OTHER}>
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Employer Name"
                value={formData.employer_name || ""}
                onChange={(e) => handleChange("employer_name", e.target.value)}
              />
              <Input
                placeholder="Job Title"
                value={formData.job_title || ""}
                onChange={(e) => handleChange("job_title", e.target.value)}
              />
              <Input
                placeholder="Employment Duration (months)"
                type="number"
                value={formData.employment_duration_months ?? ""}
                onChange={(e) =>
                  handleChange(
                    "employment_duration_months",
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
              />
            </div>
          </section>

          {/* Income */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              Income Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Annual Income"
                type="number"
                value={formData.annual_income ?? ""}
                onChange={(e) =>
                  handleChange(
                    "annual_income",
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
              />
              <Input
                placeholder="Monthly Rent Applying For *"
                type="number"
                value={formData.monthly_rent_applying_for || ""}
                onChange={(e) =>
                  handleChange(
                    "monthly_rent_applying_for",
                    parseFloat(e.target.value) || 0,
                  )
                }
                required
              />
            </div>
          </section>

          {/* References */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              References
            </h2>
            <div className="mb-4 p-4 border border-slate-200 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <Input
                  placeholder="Reference Name"
                  value={currentReference.name}
                  onChange={(e) =>
                    setCurrentReference({
                      ...currentReference,
                      name: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Reference Phone"
                  type="tel"
                  value={currentReference.phone}
                  onChange={(e) =>
                    setCurrentReference({
                      ...currentReference,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={currentReference.relationship}
                  onValueChange={(value) =>
                    setCurrentReference({
                      ...currentReference,
                      relationship: value ?? "landlord",
                    })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddReference}
                  variant="outline"
                >
                  Add Reference
                </Button>
              </div>
            </div>
            {formData.references.length > 0 && (
              <div className="space-y-2">
                {formData.references.map((ref, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded flex justify-between items-center"
                  >
                    <span>
                      {ref.name} ({ref.relationship})
                    </span>
                    <Button
                      type="button"
                      onClick={() => handleRemoveReference(idx)}
                      variant="ghost"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rental History */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              Rental History
            </h2>
            <label className="flex items-center space-x-2 mb-4">
              <Checkbox
                checked={formData.has_eviction_history}
                onCheckedChange={(checked) =>
                  handleChange("has_eviction_history", checked)
                }
              />
              <span>I have eviction history</span>
            </label>
            {formData.has_eviction_history && (
              <textarea
                placeholder="Please describe eviction details"
                value={formData.eviction_details || ""}
                onChange={(e) =>
                  handleChange("eviction_details", e.target.value)
                }
                className="w-full p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            )}
          </section>

          {/* Consent & Legal */}
          <section className="bg-slate-50 p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              Agreements
            </h2>
            <div className="space-y-4">
              <label className="flex items-start space-x-3">
                <Checkbox
                  checked={formData.agrees_to_background_check}
                  onCheckedChange={(checked) =>
                    handleChange("agrees_to_background_check", checked)
                  }
                  className="mt-1"
                />
                <span className="text-sm">
                  I authorize a background check, including credit and eviction
                  history review. *
                </span>
              </label>
              <label className="flex items-start space-x-3">
                <Checkbox
                  checked={formData.agrees_to_terms}
                  onCheckedChange={(checked) =>
                    handleChange("agrees_to_terms", checked)
                  }
                  className="mt-1"
                />
                <span className="text-sm">
                  I certify that the information provided is true and complete. *
                </span>
              </label>
            </div>
          </section>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function ConfirmationPage({ trackingId }: { trackingId: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-slate-900">
          Application Submitted!
        </h1>
        <p className="text-slate-600 mb-6">
          Thank you for applying. Your application has been received and is being
          reviewed.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <p className="text-sm font-medium text-slate-700 mb-1">
            Your Tracking ID:
          </p>
          <p className="text-lg font-mono font-bold text-blue-600">
            {trackingId}
          </p>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Use this ID to check your application status anytime.
        </p>
        <Button
          onClick={() =>
            (window.location.href = `/apply/status/${trackingId}`)
          }
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Check Status
        </Button>
      </div>
    </div>
  );
}
