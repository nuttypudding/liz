import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "../component-helpers";
import { TenantForm } from "@/components/forms/tenant-form";

describe("TenantForm", () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    onSave.mockClear();
    onCancel.mockClear();
  });

  it("renders required fields", () => {
    render(<TenantForm onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
  });

  it("populates fields from initialData", () => {
    render(
      <TenantForm
        initialData={{
          name: "Jane Smith",
          email: "jane@example.com",
          phone: "5551234567",
        }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
  });

  it("shows lease details section as collapsible", () => {
    render(<TenantForm onSave={onSave} onCancel={onCancel} />);
    // The trigger contains both "Lease Details" and "(optional)" as child spans
    const elements = screen.getAllByText("Lease Details");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("calls onSave with initial form data on submit", () => {
    const { container } = render(
      <TenantForm
        initialData={{
          name: "John Doe",
          email: "john@example.com",
        }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
      })
    );
  });

  it("calls onCancel when cancel button is clicked", () => {
    const { container } = render(
      <TenantForm onSave={onSave} onCancel={onCancel} />
    );

    const form = container.querySelector("form")!;
    const cancelBtn = within(form).getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows legacy unit number when present in initialData", () => {
    render(
      <TenantForm
        initialData={{ unit_number: "3A" }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByDisplayValue("3A")).toBeInTheDocument();
  });

  it("renders Save Tenant button", () => {
    const { container } = render(
      <TenantForm onSave={onSave} onCancel={onCancel} />
    );

    const form = container.querySelector("form")!;
    expect(within(form).getByRole("button", { name: "Save Tenant" })).toBeInTheDocument();
  });
});
