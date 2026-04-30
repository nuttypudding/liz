import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../component-helpers";
import { UtilitySetupSheet } from "@/components/properties/utility-setup-sheet";
import type { PropertyUtility } from "@/lib/types";

describe("UtilitySetupSheet", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  const defaultProps = {
    propertyId: "prop-1",
    address: "123 Oak St, Austin TX 78701",
    existingUtilities: [] as PropertyUtility[],
    open: true,
    onClose,
    onSave,
  };

  beforeEach(() => {
    onClose.mockClear();
    onSave.mockClear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          suggestions: [
            {
              utility_type: "electric",
              provider_name: "Austin Energy",
              provider_phone: "512-494-9400",
              provider_website: "https://austinenergy.com",
              confidence: "high",
            },
          ],
        }),
    });
  });

  it("renders the sheet title", () => {
    render(<UtilitySetupSheet {...defaultProps} />);
    expect(screen.getByText("Utility Providers")).toBeInTheDocument();
  });

  it("renders description with address", () => {
    render(<UtilitySetupSheet {...defaultProps} />);
    // Use getAllByText since it may appear multiple times
    const els = screen.getAllByText(/Providers for 123 Oak St/);
    expect(els.length).toBeGreaterThan(0);
  });

  it("renders all 6 utility type sections", () => {
    render(<UtilitySetupSheet {...defaultProps} />);
    // Use getAllByText since base-ui may duplicate
    expect(screen.getAllByText("Electric").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Water / Sewer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Trash / Recycling").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Internet / Cable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HOA").length).toBeGreaterThan(0);
  });

  it("renders Save and Cancel buttons", () => {
    render(<UtilitySetupSheet {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<UtilitySetupSheet {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("populates fields from existing utilities", () => {
    const existing: PropertyUtility[] = [
      {
        id: "u-1",
        property_id: "prop-1",
        utility_type: "electric",
        provider_name: "ComEd",
        provider_phone: "800-334-7661",
        provider_website: "https://comed.com",
        account_number: "1234",
        confirmation_status: "confirmed",
        ai_confidence: null,
        notes: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    render(
      <UtilitySetupSheet {...defaultProps} existingUtilities={existing} />
    );

    expect(screen.getByDisplayValue("ComEd")).toBeInTheDocument();
    expect(screen.getByDisplayValue("800-334-7661")).toBeInTheDocument();
  });

  it("auto-fetches suggestions when no existing utilities", async () => {
    render(<UtilitySetupSheet {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/utilities/suggest"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows AI badge for suggested utilities", async () => {
    render(<UtilitySetupSheet {...defaultProps} />);

    await waitFor(() => {
      const aiBadges = screen.getAllByText("AI");
      expect(aiBadges.length).toBeGreaterThan(0);
    });
  });

  it("renders not visible when open is false", () => {
    const { container } = render(
      <UtilitySetupSheet {...defaultProps} open={false} />
    );
    // Sheet should not render its content
    expect(container.querySelector("[data-slot='sheet-content']")).not.toBeInTheDocument();
  });
});
