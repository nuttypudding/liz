"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { CreditCard, List, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/submit", label: "Submit", icon: SquarePen },
  { href: "/my-requests", label: "Requests", icon: List },
  { href: "/pay", label: "Pay Rent", icon: CreditCard },
];

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky top header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4">
        <span className="text-lg font-semibold tracking-tight">Liz</span>
        <UserButton />
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Sticky bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background">
        <ul className="flex h-full items-center justify-around">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
