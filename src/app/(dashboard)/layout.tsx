"use client";

import { useEffect, useMemo } from "react";
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

  // Synchronously compute the redirection target if unauthorized
  const redirectTarget = useMemo((): string | null => {
    if (isLoading) return null;
    if (!user) return "/login";

    const userRole = user.role.toLowerCase();

    // Admins can access everything in this setup
    if (userRole === "admin" || userRole === "superadmin") {
      return null;
    }

    // Allow global shared routes for everyone
    if (
      pathname.startsWith("/profile") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/hr") ||
      pathname.startsWith("/extra-services") ||
      pathname.startsWith("/outsource-lab")
    ) {
      return null;
    }

    // Mapping for Extra Services workstation role
    const extraServicesRoles = ["extra services", "extra_services", "extraservices"];
    if (
      extraServicesRoles.includes(userRole) ||
      (user.permissions?.includes("Extra Services") && !["admin", "superadmin", "doctor"].includes(userRole))
    ) {
      if (pathname.startsWith("/superadmin/extra-services") || pathname.startsWith("/extra-services")) {
        return null;
      }
      return "/extra-services";
    }

    // Mapping for roles that use the consolidated Front Desk
    const frontdeskRoles = ["receptionist", "pharmacist", "cashier", "nurse", "frontdesk"];
    if (frontdeskRoles.includes(userRole)) {
      if (pathname.startsWith("/frontdesk")) {
        return null;
      }
      return "/frontdesk";
    }

    // For other base roles like Doctor, LabTech
    if (["doctor", "labtech"].includes(userRole)) {
      if (pathname.startsWith(`/${userRole}`)) {
        return null;
      }
      return `/${userRole}`;
    }

    // Custom roles (HR, Finance, etc) MUST be routed to superadmin
    if (pathname.startsWith("/superadmin")) {
      return null;
    }
    return "/superadmin";
  }, [user, isLoading, pathname]);

  useEffect(() => {
    if (!isLoading && redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [isLoading, redirectTarget, router]);

  // Synchronous guard: If loading, unauthenticated, or redirect is pending,
  // NEVER render DashboardShell or children!
  if (isLoading || !user || redirectTarget !== null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell>{children}</DashboardShell>
  );
}
