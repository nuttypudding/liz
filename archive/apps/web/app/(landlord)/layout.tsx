import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LandlordBottomNav } from "@/components/layout/landlord-bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* Sidebar — hidden on mobile, visible lg+ */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>

      {/* Bottom nav — visible on mobile only */}
      <LandlordBottomNav />
    </SidebarProvider>
  );
}
