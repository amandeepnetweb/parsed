import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

interface AppShellProps {
  user: { name: string; email: string };
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
