import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../component-helpers";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ property: { id: "prop-new" } }),
    });
  });

  it("renders step 1 with welcome text", () => {
    render(<OnboardingWizard />);
    expect(screen.getAllByText(/Welcome to Liz/).length).toBeGreaterThan(0);
  });

  it("shows step progress indicator", () => {
    render(<OnboardingWizard />);
    expect(screen.getAllByText(/Step 1 of 5/).length).toBeGreaterThan(0);
  });

  it("shows risk appetite options on step 1", () => {
    render(<OnboardingWizard />);
    expect(screen.getAllByText("Save Money").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Balanced").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Move Fast").length).toBeGreaterThan(0);
  });

  it("shows delegation mode options on step 1", () => {
    render(<OnboardingWizard />);
    expect(screen.getAllByText("I approve everything").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Auto-approve small jobs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Full autopilot").length).toBeGreaterThan(0);
  });

  it("navigates to step 2 when Next is clicked", () => {
    render(<OnboardingWizard />);
    const nextBtns = screen.getAllByRole("button", { name: /Next/i });
    fireEvent.click(nextBtns[0]);
    expect(screen.getAllByText(/Add your first property/i).length).toBeGreaterThan(0);
  });

  it("navigates to step 2 when Use default AI settings is clicked", () => {
    render(<OnboardingWizard />);
    const skipBtns = screen.getAllByText("Use default AI settings");
    fireEvent.click(skipBtns[0]);
    expect(screen.getAllByText(/Add your first property/i).length).toBeGreaterThan(0);
  });

  it("shows property form fields on step 2", () => {
    render(<OnboardingWizard />);
    const nextBtns = screen.getAllByRole("button", { name: /Next/i });
    fireEvent.click(nextBtns[0]);
    expect(screen.getByLabelText("Property name")).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toBeInTheDocument();
  });

  it("validates property name on step 2", () => {
    render(<OnboardingWizard />);
    // Go to step 2
    const nextBtns = screen.getAllByRole("button", { name: /Next/i });
    fireEvent.click(nextBtns[0]);

    // Try to advance without filling
    const step2NextBtns = screen.getAllByRole("button", { name: /Next/i });
    fireEvent.click(step2NextBtns[0]);

    expect(screen.getAllByText("Property name is required").length).toBeGreaterThan(0);
  });

  it("navigates back from step 2 to step 1", () => {
    render(<OnboardingWizard />);
    // Go to step 2
    const nextBtns = screen.getAllByRole("button", { name: /Next/i });
    fireEvent.click(nextBtns[0]);
    expect(screen.getAllByText(/Step 2 of 5/).length).toBeGreaterThan(0);

    // Go back
    const backBtns = screen.getAllByRole("button", { name: /Back/i });
    fireEvent.click(backBtns[0]);
    expect(screen.getAllByText(/Step 1 of 5/).length).toBeGreaterThan(0);
  });

  it("step 2 to step 3 after valid property", () => {
    render(<OnboardingWizard />);
    // Step 1 -> 2
    const nextBtns = screen.getAllByRole("button", { name: /Next/i });
    fireEvent.click(nextBtns[0]);

    // Fill required property fields
    const nameInput = screen.getByLabelText("Property name");
    const addressInput = screen.getByLabelText("Address");
    fireEvent.change(nameInput, { target: { value: "Test Property" } });
    fireEvent.change(addressInput, { target: { value: "123 Test St" } });

    // Step 2 -> 3
    const step2NextBtns = screen.getAllByRole("button", { name: /Next/i });
    fireEvent.click(step2NextBtns[0]);
    expect(screen.getAllByText(/Step 3 of 5/).length).toBeGreaterThan(0);
  });
});
