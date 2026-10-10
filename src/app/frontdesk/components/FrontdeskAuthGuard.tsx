"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2 } from "lucide-react";

export function FrontdeskAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else {
        const role = user.role.toLowerCase();
        const allowed = ["receptionist", "pharmacist", "cashier", "admin", "superadmin", "nurse"];
        
        if (!allowed.includes(role)) {
          // If not allowed, send to their own dashboard
          router.push(`/${role}`);
        } else if (role === "nurse") {
          // Only allow nurse to hit root, arrivals, hr, and settings
          const allowedPaths = ["/frontdesk", "/frontdesk/arrivals", "/frontdesk/hr", "/frontdesk/settings"];
          if (!allowedPaths.some(p => pathname === p || pathname.startsWith(p + "/"))) {
            router.push("/frontdesk");
          }
        }
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
