import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../component-helpers";
import { DocumentUploader } from "@/components/documents/document-uploader";

describe("DocumentUploader", () => {
  const defaultProps = {
    propertyId: "prop-1",
    tenants: [
      {
        id: "t-1",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: null,
        unit_number: "2B",
        property_id: "prop-1",
        move_in_date: null,
        lease_type: null as const,
        lease_start_date: null,
        lease_end_date: null,
        rent_due_day: null,
        custom_fields: null,
      },
    ],
    onUploadComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders document type label", () => {
    render(<DocumentUploader {...defaultProps} />);
    expect(screen.getAllByText("Document Type").length).toBeGreaterThan(0);
  });

  it("renders description input", () => {
    render(<DocumentUploader {...defaultProps} />);
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
  });

  it("renders tenant selector when tenants exist", () => {
    render(<DocumentUploader {...defaultProps} />);
    expect(screen.getAllByText("Tenant (optional)").length).toBeGreaterThan(0);
  });

  it("hides tenant selector when no tenants", () => {
    const { container } = render(<DocumentUploader {...defaultProps} tenants={[]} />);
    // When tenants=[], the tenant select field is not rendered
    expect(container.querySelector("#doc-tenant")).not.toBeInTheDocument();
  });

  it("renders drop zone", () => {
    render(<DocumentUploader {...defaultProps} />);
    expect(screen.getAllByText(/Drag & drop files here/).length).toBeGreaterThan(0);
  });

  it("renders upload button as disabled initially", () => {
    const { container } = render(<DocumentUploader {...defaultProps} />);
    const buttons = container.querySelectorAll("button[disabled]");
    const uploadBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes("Upload")
    );
    expect(uploadBtn).toBeTruthy();
  });

  it("shows file size info text", () => {
    render(<DocumentUploader {...defaultProps} />);
    expect(screen.getAllByText(/Max 10 MB each/).length).toBeGreaterThan(0);
  });
});
