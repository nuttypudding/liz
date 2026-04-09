import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../component-helpers";
import { PropertyDrillDown } from "@/components/dashboard/property-drilldown";
import type { Property } from "@/lib/types";

const mockProperty: Property = {
  id: "prop-1",
  name: "Oak Street Apartments",
  address_line1: "123 Oak St",
  city: "Austin",
  state: "TX",
  postal_code: "78701",
  apt_or_unit_no: null,
  unit_count: 4,
  monthly_rent: 1600,
  rent_due_day: 1,
  landlord_id: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  tenants: [
    {
      id: "t-1",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      phone: null,
      unit_number: "2B",
      property_id: "prop-1",
      move_in_date: null,
      lease_type: null,
      lease_start_date: null,
      lease_end_date: null,
      rent_due_day: null,
      custom_fields: null,
    },
  ],
};

function setupFetchMock() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("rent-status")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            property_id: "prop-1",
            monthly_rent: 1600,
            rent_due_day: 1,
            last_paid_at: null,
            last_paid_amount: null,
            is_overdue: false,
            days_overdue: 0,
          }),
      });
    }
    if (url.includes("stats")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            emergency_count: 0,
            open_count: 2,
            avg_resolution_days: 3.5,
            monthly_spend: 250,
          }),
      });
    }
    if (url.includes("spend-chart")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    }
    if (url.includes("requests")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ requests: [] }),
      });
    }
    if (url.includes("utilities")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ utilities: [] }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });
}

describe("PropertyDrillDown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchMock();
  });

  it("renders property header with name and address", () => {
    render(
      <PropertyDrillDown propertyId="prop-1" property={mockProperty} />
    );
    expect(screen.getByText("Oak Street Apartments")).toBeInTheDocument();
    expect(screen.getByText(/123 Oak St/)).toBeInTheDocument();
  });

  it("renders tab triggers", () => {
    render(
      <PropertyDrillDown propertyId="prop-1" property={mockProperty} />
    );
    // Use getAllBy since base-ui tabs may render duplicates
    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Work Orders").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tenants").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Documents").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Photos").length).toBeGreaterThan(0);
  });

  it("shows unit count", () => {
    render(
      <PropertyDrillDown propertyId="prop-1" property={mockProperty} />
    );
    const elements = screen.getAllByText("4 units");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("shows tenant count", () => {
    render(
      <PropertyDrillDown propertyId="prop-1" property={mockProperty} />
    );
    const elements = screen.getAllByText("1 tenant");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("fetches overview data on mount", async () => {
    render(
      <PropertyDrillDown propertyId="prop-1" property={mockProperty} />
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("shows error card when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(
      <PropertyDrillDown propertyId="prop-1" property={mockProperty} />
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });
  });
});
