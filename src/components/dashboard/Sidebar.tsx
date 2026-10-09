"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Banknote,
  Building2,
  Settings,
  LogOut,
  ClipboardList,
  CalendarClock,
  UserPlus,
  Stethoscope,
  FlaskConical,
  FileText,
  Pill,
  PackageSearch,
  Receipt,
  Microscope,
  FileSearch2,
  FilePlus2,
  CreditCard,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";
import { useAuth } from "@/components/providers/AuthProvider";

type NavItem = { label: string; href: string; icon: React.ElementType; category?: string };

const roleNavConfig: Record<string, NavItem[]> = {
  superadmin: [
    { href: "/superadmin", label: "Overview", icon: LayoutDashboard, category: "Dashboard" },
    
    { href: "/superadmin/finance", label: "Finance", icon: Banknote, category: "Operations" },
    { href: "/superadmin/inventory", label: "Inventory Engine", icon: PackageSearch, category: "Operations" },
    { href: "/superadmin/lab-tests", label: "Lab Templates", icon: FlaskConical, category: "Operations" },
    { href: "/superadmin/extra-services", label: "Extra Services", icon: FilePlus2, category: "Operations" },


    { href: "/superadmin/departments", label: "Departments", icon: Building2, category: "Management" },
    { href: "/superadmin/rooms", label: "Room Management", icon: Building2, category: "Management" },
    
    { href: "/superadmin/rbac", label: "Access Control", icon: Shield, category: "System" },
    { href: "/settings", label: "Settings", icon: Settings, category: "System" },
  ],
  frontdesk: [
    { href: "/frontdesk", label: "Dashboard", icon: LayoutDashboard },
    { href: "/frontdesk/queue", label: "Queue & Tokens", icon: Users },
    { href: "/frontdesk/billing", label: "Centralized Billing", icon: Receipt },
    { href: "/frontdesk/inventory", label: "Restock & Operations", icon: PackageSearch },
    { href: "/frontdesk/rooms", label: "Room Management", icon: Building2 },
    { href: "/hr", label: "My HR Portal", icon: Users },
  ],
  doctor: [
    { href: "/doctor", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/doctor/queue", label: "Patient Queue", icon: ClipboardList },
    { href: "/doctor/prescriptions", label: "Prescriptions", icon: FileText },
    { href: "/doctor/lab-requests", label: "Lab Requests", icon: FlaskConical },
    { href: "/hr", label: "My HR Portal", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  labtech: [
    { href: "/labtech", label: "Overview", icon: LayoutDashboard },
    { href: "/labtech/queue", label: "Frontdesk Queue", icon: Users },
    { href: "/labtech/requests", label: "Test Requests", icon: Microscope },
    { href: "/labtech/reports", label: "Published Reports", icon: FileSearch2 },
    { href: "/labtech/lab-tests", label: "Lab Templates", icon: FlaskConical },
    { href: "/hr", label: "My HR Portal", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  nurse: [
    { href: "/frontdesk/arrivals", label: "Arrivals & Queue", icon: Users },
    { href: "/hr", label: "My HR Portal", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
};

const roleLabelMap: Record<string, string> = {
  superadmin: "Super Admin",
  frontdesk: "Front Desk",
  doctor: "Doctor",
  labtech: "Lab",
  nurse: "Nurse",
};

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();

  // Determine the current role from the user context, fallback to pathname, then superadmin
  const roleKey = user?.role?.toLowerCase() || Object.keys(roleNavConfig).find((key) =>
    pathname.startsWith(`/${key}`)
  ) || "superadmin";

  const navItems = roleNavConfig[roleKey] || roleNavConfig["superadmin"];
  const roleLabel = roleLabelMap[roleKey] || "Staff";
  const width = isCollapsed ? "w-[80px]" : "w-64";

  return (
    <aside className={cn("h-screen bg-card text-card-foreground border-r flex flex-col shadow-sm fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out", width)}>
      <div className={cn("h-16 flex items-center border-b shrink-0", isCollapsed ? "justify-center px-0" : "px-6")}>
        {isCollapsed ? (
          <Image src="/logo.png" alt="AMAZ" width={32} height={32} className="object-contain" />
        ) : (
          <Image src="/logo.png" alt="AMAZ Hospital" width={140} height={40} className="object-contain" priority />
        )}
      </div>

      <div className={cn("pt-4 pb-1 transition-opacity duration-200", isCollapsed ? "px-0 text-center" : "px-4")}>
        {isCollapsed ? (
          <div className="w-8 h-[1px] bg-border mx-auto my-2" />
        ) : (
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            {roleLabel}
          </span>
        )}
      </div>

      <nav className="flex-1 px-4 py-2 overflow-y-auto">
        {Array.from(new Set(navItems.map(i => i.category || ""))).map(category => (
          <div key={category || "uncategorized"} className={category ? "mt-6 mb-2" : "mt-1"}>
            {category && !isCollapsed && (
              <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
                {category}
              </h4>
            )}
            {category && isCollapsed && (
              <div className="w-8 h-[1px] bg-border/50 mx-auto my-3" />
            )}
            <div className="space-y-1">
              {navItems.filter(i => (i.category || "") === category).map(item => {
                const isExact = item.href === `/${roleKey}`;
                const isActive = isExact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-all duration-200",
                      isCollapsed ? "justify-center py-3 px-0 mx-2" : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(isCollapsed ? "w-6 h-6" : "w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t shrink-0 flex flex-col", isCollapsed ? "p-2" : "p-4")}>
        <Link
          href="/login"
          title={isCollapsed ? "Logout" : undefined}
          className={cn(
            "flex items-center rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            isCollapsed ? "justify-center py-3 px-0" : "gap-3 px-3 py-2.5"
          )}
        >
          <LogOut className={cn(isCollapsed ? "w-6 h-6 text-destructive" : "w-5 h-5")} />
          {!isCollapsed && <span>Logout</span>}
        </Link>
      </div>
    </aside>
  );
}
