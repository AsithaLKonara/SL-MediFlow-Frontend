"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2 } from "lucide-react";

export function FrontdeskAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else {
        const role = user.role.toLowerCase();
        const allowed = ["receptionist", "pharmacist", "cashier", "admin", "superadmin"];
        
        if (!allowed.includes(role)) {
          // If not allowed, send to their own dashboard
          router.push(`/${role}`);
        }
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
