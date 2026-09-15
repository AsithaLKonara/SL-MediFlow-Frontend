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
  Stethoscope,
  FlaskConical,
  FileText,
  Pill,
  PackageSearch,
  Receipt,
  Microscope,
  FileSearch2,
  FilePlus2,
  Banknote,
  CreditCard,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";

const roleNavConfig: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  superadmin: [
    { href: "/superadmin", label: "Overview", icon: LayoutDashboard },
    { href: "/superadmin/staff", label: "Staff", icon: Users },
    { href: "/superadmin/finance", label: "Finance", icon: DollarSign },
    { href: "/superadmin/departments", label: "Departments", icon: Building2 },
    { href: "/superadmin/rbac", label: "Access Control", icon: Shield },
    { href: "/superadmin/settings", label: "Settings", icon: Settings },
    
    // Cross-role access for Super Admin
    { href: "/receptionist/patients", label: "Reception: Patients", icon: UserPlus },
    { href: "/receptionist/queue", label: "Reception: New Visit", icon: CalendarClock },
    { href: "/doctor/queue", label: "Doctor: Patient Queue", icon: ClipboardList },
    { href: "/pharmacist/prescriptions", label: "Pharmacy: Scan RX", icon: Pill },
    { href: "/labtech/requests", label: "Lab: Test Requests", icon: Microscope },
    { href: "/cashier/payments", label: "Cashier: Payments", icon: Banknote },
  ],
  receptionist: [
    { href: "/receptionist", label: "Overview", icon: LayoutDashboard },
    { href: "/receptionist/patients", label: "Patients", icon: UserPlus },
    { href: "/receptionist/queue", label: "New Visit", icon: CalendarClock },
  ],
  doctor: [
    { href: "/doctor", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/doctor/queue", label: "Patient Queue", icon: ClipboardList },
    { href: "/doctor/prescriptions", label: "Prescriptions", icon: FileText },
    { href: "/doctor/lab-requests", label: "Lab Requests", icon: FlaskConical },
  ],
  pharmacist: [
    { href: "/pharmacist", label: "Overview", icon: LayoutDashboard },
    { href: "/pharmacist/prescriptions", label: "Scan Prescription", icon: Pill },
    { href: "/pharmacist/inventory", label: "Inventory", icon: PackageSearch },
  ],
  labtech: [
    { href: "/labtech", label: "Overview", icon: LayoutDashboard },
    { href: "/labtech/requests", label: "Test Requests", icon: Microscope },
    { href: "/labtech/reports", label: "Published Reports", icon: FileSearch2 },
  ],
  cashier: [
    { href: "/cashier", label: "Overview", icon: LayoutDashboard },
    { href: "/cashier/payments", label: "Payments", icon: Banknote },
  ],
};

const roleLabelMap: Record<string, string> = {
  superadmin: "Super Admin",
  receptionist: "Receptionist",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  labtech: "Lab Technician",
  cashier: "Cashier",
};

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  // Determine the current role from the pathname
  const roleKey = Object.keys(roleNavConfig).find((key) =>
    pathname.startsWith(`/${key}`)
  ) ?? "superadmin";

  const navItems = roleNavConfig[roleKey];
  const roleLabel = roleLabelMap[roleKey];
  const width = isCollapsed ? "w-[80px]" : "w-64";

  return (
    <aside className={cn("h-screen bg-card text-card-foreground border-r flex flex-col shadow-sm fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out", width)}>
      <div className={cn("h-16 flex items-center border-b shrink-0", isCollapsed ? "justify-center px-0" : "px-6")}>
        {isCollapsed ? (
          <div className="font-bold text-xl text-primary">A+</div>
        ) : (
          <Image src="/logo.png" alt="AMAZ Hospital" width={140} height={40} className="object-contain" />
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

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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
