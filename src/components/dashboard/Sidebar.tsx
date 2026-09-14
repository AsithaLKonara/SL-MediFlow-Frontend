"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Building2,
  Settings,
  LogOut,
  ClipboardList,
  CalendarClock,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const roleNavConfig: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  superadmin: [
    { href: "/superadmin", label: "Overview", icon: LayoutDashboard },
    { href: "/superadmin/staff", label: "Staff Management", icon: Users },
    { href: "/superadmin/finance", label: "Finance", icon: DollarSign },
    { href: "/superadmin/departments", label: "Departments", icon: Building2 },
    { href: "/superadmin/settings", label: "Settings", icon: Settings },
  ],
  receptionist: [
    { href: "/receptionist", label: "Overview", icon: LayoutDashboard },
    { href: "/receptionist/patients", label: "Patient Registration", icon: UserPlus },
    { href: "/receptionist/queue", label: "OPD Queue", icon: CalendarClock },
  ],
};

const roleLabelMap: Record<string, string> = {
  superadmin: "Super Admin",
  receptionist: "Receptionist",
};

export function Sidebar() {
  const pathname = usePathname();

  // Determine the current role from the pathname
  const roleKey = Object.keys(roleNavConfig).find((key) =>
    pathname.startsWith(`/${key}`)
  ) ?? "superadmin";

  const navItems = roleNavConfig[roleKey];
  const roleLabel = roleLabelMap[roleKey];

  return (
    <aside className="w-64 h-screen bg-white border-r flex flex-col shadow-sm fixed left-0 top-0 z-40">
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <Image src="/logo.png" alt="AMAZ Hospital" width={140} height={40} className="object-contain" />
      </div>

      <div className="px-4 pt-4 pb-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          {roleLabel}
        </span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isExact = item.href === `/${roleKey}`;
          const isActive = isExact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t shrink-0">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Link>
      </div>
    </aside>
  );
}
