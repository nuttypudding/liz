import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "../component-helpers";
import { PropertyForm } from "@/components/forms/property-form";

describe("PropertyForm", () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    onSave.mockClear();
    onCancel.mockClear();
  });

  it("renders all form fields", () => {
    render(<PropertyForm onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByLabelText("Property Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Street Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Apt or Unit No.")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("State")).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP Code")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit Count")).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly Rent ($)")).toBeInTheDocument();
  });

  it("populates fields from initialData", () => {
    render(
      <PropertyForm
        initialData={{
          name: "Oak St",
          address_line1: "123 Oak St",
          city: "Austin",
          state: "TX",
          postal_code: "78701",
          apt_or_unit_no: "2B",
          unit_count: 4,
          monthly_rent: 1600,
        }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByDisplayValue("Oak St")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123 Oak St")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Austin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("TX")).toBeInTheDocument();
    expect(screen.getByDisplayValue("78701")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2B")).toBeInTheDocument();
  });

  it("calls onSave with initial form data on submit", () => {
    const { container } = render(
      <PropertyForm
        initialData={{
          name: "Test Property",
          address_line1: "456 Test Ave",
          city: "Austin",
          state: "TX",
          postal_code: "78702",
          unit_count: 2,
          monthly_rent: 1200,
        }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Property",
        address_line1: "456 Test Ave",
        city: "Austin",
        state: "TX",
        postal_code: "78702",
        unit_count: 2,
        monthly_rent: 1200,
      })
    );
  });

  it("calls onCancel when cancel button is clicked", () => {
    const { container } = render(
      <PropertyForm onSave={onSave} onCancel={onCancel} />
    );

    const form = container.querySelector("form")!;
    const cancelBtn = within(form).getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders Save Property button", () => {
    const { container } = render(
      <PropertyForm onSave={onSave} onCancel={onCancel} />
    );

    const form = container.querySelector("form")!;
    expect(within(form).getByRole("button", { name: "Save Property" })).toBeInTheDocument();
  });
});
