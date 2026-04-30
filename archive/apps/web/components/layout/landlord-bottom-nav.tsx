"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brain, Building2, ClipboardList, CreditCard, DollarSign, LayoutDashboard, Settings, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requests", label: "Requests", icon: Wrench },
  { href: "/autopilot", label: "Autopilot", icon: Brain },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/rent", label: "Rent", icon: DollarSign },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function usePendingApplicationCount() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await fetch("/api/applications?status=submitted&limit=1");
      if (!res.ok) return;
      const data = await res.json() as { pagination?: { total?: number } };
      setCount(data.pagination?.total ?? 0);
    } catch {
      // silently ignore fetch errors
    }
  };

  useEffect(() => {
    fetchCount();
    window.addEventListener("focus", fetchCount);
    return () => window.removeEventListener("focus", fetchCount);
  }, []);

  return count;
}

function usePendingDecisionCount() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await fetch("/api/autonomy/decisions?status=pending_review&limit=1");
      if (!res.ok) return;
      const data = await res.json() as { total?: number };
      setCount(data.total ?? 0);
    } catch {
      // silently ignore fetch errors
    }
  };

  useEffect(() => {
    fetchCount();
    window.addEventListener("focus", fetchCount);
    return () => window.removeEventListener("focus", fetchCount);
  }, []);

  return count;
}

export function LandlordBottomNav() {
  const pathname = usePathname();
  const pendingCount = usePendingDecisionCount();
  const pendingApplicationCount = usePendingApplicationCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background lg:hidden">
      <ul className="flex h-full items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          const isAutopilot = href === "/autopilot";
          const isApplications = href === "/applications";
          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {isAutopilot && pendingCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                  {isApplications && pendingApplicationCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white">
                      {pendingApplicationCount > 99 ? "99+" : pendingApplicationCount}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
