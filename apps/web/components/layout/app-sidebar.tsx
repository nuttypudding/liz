"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Building2, LayoutDashboard, Settings, Users, Wrench } from "lucide-react";
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
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

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
                  pathname === href || pathname.startsWith(href + "/");
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
