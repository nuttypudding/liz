import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../component-helpers";
import { RequestCard } from "@/components/requests/request-card";
import { ApproveButton } from "@/components/requests/approve-button";

describe("RequestCard", () => {
  const mockRequest = {
    id: "req-1",
    tenant_message: "Kitchen sink is leaking badly",
    ai_category: "plumbing",
    ai_urgency: "emergency",
    status: "triaged",
    created_at: "2026-04-01T12:00:00Z",
    property_name: "Oak St Apartments",
  };

  it("renders tenant message", () => {
    render(<RequestCard request={mockRequest} />);
    expect(screen.getAllByText("Kitchen sink is leaking badly").length).toBeGreaterThan(0);
  });

  it("renders property name", () => {
    render(<RequestCard request={mockRequest} />);
    expect(screen.getAllByText("Oak St Apartments").length).toBeGreaterThan(0);
  });

  it("renders urgency badge", () => {
    render(<RequestCard request={mockRequest} />);
    expect(screen.getAllByText("Emergency").length).toBeGreaterThan(0);
  });

  it("renders status badge", () => {
    render(<RequestCard request={mockRequest} />);
    expect(screen.getAllByText("Triaged").length).toBeGreaterThan(0);
  });

  it("renders formatted date", () => {
    render(<RequestCard request={mockRequest} />);
    expect(screen.getAllByText("Apr 1").length).toBeGreaterThan(0);
  });

  it("renders as a link when href is provided", () => {
    render(<RequestCard request={mockRequest} href="/requests/req-1" />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "/requests/req-1");
  });

  it("renders without link when no href", () => {
    const { container } = render(<RequestCard request={mockRequest} />);
    // When no href, the card should not be wrapped in a link
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });

  it("handles medium urgency", () => {
    render(
      <RequestCard request={{ ...mockRequest, ai_urgency: "medium" }} />
    );
    expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
  });

  it("handles low urgency", () => {
    render(
      <RequestCard request={{ ...mockRequest, ai_urgency: "low" }} />
    );
    expect(screen.getAllByText("Low").length).toBeGreaterThan(0);
  });

  it("defaults to low urgency when null", () => {
    render(
      <RequestCard request={{ ...mockRequest, ai_urgency: null }} />
    );
    expect(screen.getAllByText("Low").length).toBeGreaterThan(0);
  });
});

describe("ApproveButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the approve button text", () => {
    render(<ApproveButton vendorName="Fix-It Plumbing" />);
    expect(screen.getAllByText(/Approve/).length).toBeGreaterThan(0);
  });

  it("is disabled when no vendorName", () => {
    const { container } = render(<ApproveButton vendorName={undefined} />);
    const trigger = container.querySelector("button[disabled]");
    expect(trigger).toBeTruthy();
  });

  it("is disabled when disabled prop is true", () => {
    const { container } = render(
      <ApproveButton vendorName="Fix-It Plumbing" disabled />
    );
    const trigger = container.querySelector("button[disabled]");
    expect(trigger).toBeTruthy();
  });
});
