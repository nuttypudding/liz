"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Brain, Building2, ClipboardList, CreditCard, DollarSign, LayoutDashboard, Settings, Shield, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requests", label: "Requests", icon: Wrench },
  { href: "/autopilot", label: "Autopilot", icon: Brain },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/rent", label: "Rent", icon: DollarSign },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/compliance", label: "Compliance", icon: Shield },
  { href: "/dashboard/payments", label: "Payments", icon: DollarSign },
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

export function AppSidebar() {
  const pathname = usePathname();
  const pendingCount = usePendingDecisionCount();
  const pendingApplicationCount = usePendingApplicationCount();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          <span className="text-lg font-semibold tracking-tight">Liz</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/dashboard"
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/");
                const isAutopilot = href === "/autopilot";
                const isApplications = href === "/applications";
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      data-active={isActive || undefined}
                      render={<Link href={href} />}
                      className={cn(
                        isActive && "font-medium text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon />
                      <span>{label}</span>
                      {isAutopilot && pendingCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                      )}
                      {isApplications && pendingApplicationCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                          {pendingApplicationCount > 99 ? "99+" : pendingApplicationCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1">
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
