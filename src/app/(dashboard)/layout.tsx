"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else {
        // Simple RBAC check based on the current path
        const userRole = user.role.toLowerCase();
        
        // Admins can access everything in this simple setup
        if (userRole !== "admin" && userRole !== "superadmin") {
           // Allow global shared routes for everyone
           if (pathname.startsWith("/profile") || pathname.startsWith("/settings") || pathname.startsWith("/hr")) {
             return; // allow
           }
           
           // Mapping for roles that use the consolidated Front Desk
           const frontdeskRoles = ["receptionist", "pharmacist", "cashier", "nurse", "frontdesk"];
           
           if (frontdeskRoles.includes(userRole)) {
             if (!pathname.startsWith(`/frontdesk`)) {
               router.push(`/frontdesk`);
             }
           } else if (["doctor", "labtech"].includes(userRole)) {
             // For other base roles like Doctor, LabTech
             if (!pathname.startsWith(`/${userRole}`)) {
               router.push(`/${userRole}`);
             }
           } else {
             // Custom roles (HR, Finance, etc) MUST be routed to superadmin
             if (!pathname.startsWith(`/superadmin`)) {
               router.push(`/superadmin`);
             }
           }
        }
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell>{children}</DashboardShell>
  )
}
