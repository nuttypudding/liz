import React from "react";
import { render, type RenderOptions } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
const mockRefresh = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    refresh: mockRefresh,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link as a plain anchor
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock sonner toast
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
vi.mock("sonner", () => ({
  toast: mockToast,
  Toaster: () => null,
}));

/**
 * Wrapper that provides necessary context providers for component tests.
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Custom render that wraps components with test providers.
 */
function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

export { customRender as render, mockPush, mockBack, mockRefresh, mockReplace };
export { screen, waitFor, within, fireEvent, act } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
