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
  Hospital,
  ActivitySquare,
  Clock,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";
import { useAuth } from "@/components/providers/AuthProvider";

type NavItem = { label: string; href: string; icon: React.ElementType; category?: string; permission?: string };

const roleNavConfig: Record<string, NavItem[]> = {
  superadmin: [
    { href: "/superadmin", label: "Overview", icon: LayoutDashboard, category: "Dashboard" },
    
    { href: "/superadmin/finance", label: "Finance", icon: Banknote, category: "Operations", permission: "Finance" },
    { href: "/superadmin/fund-office", label: "Fund Office (Doctors)", icon: Receipt, category: "Operations", permission: "Finance" },
    { href: "/frontdesk/doctor-share", label: "Doctor Share Payouts", icon: Stethoscope, category: "Operations", permission: "Finance" },
    { href: "/superadmin/finance/doctor-statements", label: "Doctor Settlements", icon: Stethoscope, category: "Operations", permission: "Finance" },
    { href: "/superadmin/inventory", label: "Inventory Engine", icon: PackageSearch, category: "Operations", permission: "Inventory" },
    { href: "/superadmin/lab-tests", label: "Lab Templates", icon: FlaskConical, category: "Operations", permission: "Lab Tests" },
    { href: "/superadmin/extra-services", label: "Extra Services", icon: FilePlus2, category: "Operations", permission: "Extra Services" },

    { href: "/superadmin/staff", label: "Employee Directory", icon: Users, category: "Management", permission: "Staff" },
    { href: "/superadmin/hr/attendance", label: "Attendance & Leaves", icon: CalendarClock, category: "Management", permission: "HR" },
    { href: "/superadmin/hr/overtime", label: "Overtime (OT)", icon: Clock, category: "Management", permission: "HR" },
    { href: "/superadmin/hr/salary-structures", label: "Salary & Allowances", icon: Receipt, category: "Management", permission: "HR" },
    { href: "/superadmin/hr/components", label: "Role Templates", icon: ClipboardList, category: "Management", permission: "HR" },
    { href: "/superadmin/hr/payroll", label: "Payroll Engine", icon: Banknote, category: "Management", permission: "HR" },
    { href: "/superadmin/departments", label: "Departments", icon: Building2, category: "Management", permission: "Departments" },
    { href: "/superadmin/rooms", label: "Room Management", icon: Building2, category: "Management", permission: "Rooms" },
    
    { href: "/superadmin/rbac", label: "Access Control", icon: Shield, category: "System", permission: "RBAC" },
    { href: "/superadmin/settings", label: "System Settings", icon: Hospital, category: "System", permission: "Settings" },
    { href: "/settings", label: "My Profile", icon: Settings, category: "System" },
  ],
  frontdesk: [
    { href: "/frontdesk", label: "Dashboard", icon: LayoutDashboard },
    { href: "/frontdesk/queue", label: "Queue & Tokens", icon: Users },
    { href: "/frontdesk/billing", label: "Centralized Billing", icon: Receipt },
    { href: "/frontdesk/doctor-share", label: "Doctor Share Payouts", icon: Stethoscope },
    { href: "/frontdesk/inventory", label: "Restock & Operations", icon: PackageSearch },
    { href: "/frontdesk/rooms", label: "Room Management", icon: Building2 },
    { href: "/frontdesk/hr", label: "My HR & Leaves", icon: CalendarClock },
  ],
  doctor: [
    { href: "/doctor", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/doctor/queue", label: "Patient Queue", icon: ClipboardList },
    { href: "/doctor/prescriptions", label: "Prescriptions", icon: FileText },
    { href: "/doctor/lab-requests", label: "Lab Requests", icon: FlaskConical },
    { href: "/hr", label: "My HR & Leaves", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  labtech: [
    { href: "/labtech", label: "Overview", icon: LayoutDashboard },
    { href: "/labtech/requests", label: "Test Requests", icon: Microscope },
    { href: "/labtech/reports", label: "Published Reports", icon: FileSearch2 },
    { href: "/labtech/lab-tests", label: "Lab Templates", icon: FlaskConical },
    { href: "/hr", label: "My HR & Leaves", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  nurse: [
    { href: "/nurse", label: "Extra Services Station", icon: ActivitySquare },
    { href: "/frontdesk/arrivals", label: "Arrivals & Queue", icon: Users },
    { href: "/hr", label: "My HR & Leaves", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  pharmacist: [
    { href: "/pharmacist", label: "Overview", icon: LayoutDashboard },
    { href: "/pharmacist/prescriptions", label: "Prescriptions", icon: FileText },
    { href: "/pharmacist/billing", label: "POS Billing", icon: Receipt },
    { href: "/pharmacist/inventory", label: "Pharmacy Stock", icon: PackageSearch },
    { href: "/hr", label: "My HR & Leaves", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  receptionist: [
    { href: "/receptionist", label: "Overview", icon: LayoutDashboard },
    { href: "/receptionist/queue", label: "Patient Queue", icon: ClipboardList },
    { href: "/receptionist/patients", label: "Patient Directory", icon: Users },
    { href: "/frontdesk/doctor-share", label: "Doctor Share Payouts", icon: Stethoscope },
    { href: "/hr", label: "My HR & Leaves", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  cashier: [
    { href: "/cashier", label: "Overview", icon: LayoutDashboard },
    { href: "/cashier/payments", label: "Payments List", icon: CreditCard },
    { href: "/frontdesk/billing", label: "Centralized Billing", icon: Receipt },
    { href: "/frontdesk/doctor-share", label: "Doctor Share Payouts", icon: Stethoscope },
    { href: "/hr", label: "My HR & Leaves", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  fundoffice: [
    { href: "/superadmin/fund-office", label: "Fund Office Dashboard", icon: LayoutDashboard },
    { href: "/frontdesk/doctor-share", label: "Doctor Share Payouts", icon: Stethoscope },
    { href: "/superadmin/finance", label: "Finance Overview", icon: Banknote },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
};

const roleLabelMap: Record<string, string> = {
  superadmin: "Super Admin",
  frontdesk: "Front Desk",
  doctor: "Doctor",
  labtech: "Lab",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  receptionist: "Receptionist",
  cashier: "Cashier",
  fundoffice: "Fund Office",
};

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();

  // Determine the current role from the user context, fallback to pathname, then superadmin
  const roleKey = user?.role?.toLowerCase() || Object.keys(roleNavConfig).find((key) =>
    pathname.startsWith(`/${key}`)
  ) || "superadmin";

  let navItems = roleNavConfig[roleKey] || roleNavConfig["superadmin"];
  
  // Filter for Custom Roles
  if (user && roleKey === "superadmin" && user.role?.toLowerCase() !== "superadmin" && user.role?.toLowerCase() !== "admin") {
    navItems = navItems.filter(item => {
      if (!item.permission) return true;
      return user.permissions?.includes(item.permission) || user.permissions?.includes("ALL");
    });
  }

  const roleLabel = user?.role ? user.role : (roleLabelMap[roleKey] || "Staff");
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
