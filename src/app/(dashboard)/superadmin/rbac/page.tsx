"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Save, 
  Users, 
  Plus, 
  ActivitySquare, 
  CreditCard, 
  Building2, 
  Settings2,
  CheckCheck,
  RotateCcw
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/AuthProvider";

interface Permissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

interface RoleRbac {
  id: string;
  name: string;
  permissions: Record<string, Permissions>;
}

export interface SystemModule {
  id: string;
  label: string;
  description: string;
  category: "Clinical & Procedures" | "Frontdesk & Billing" | "Management & Governance" | "System Administration";
}

export const SYSTEM_MODULES: SystemModule[] = [
  // Clinical & Procedures
  { 
    id: "Extra Services", 
    label: "Extra Services Station", 
    description: "Procedure workstation (ECG, Dressing, Injections), report uploads, and completion queue", 
    category: "Clinical & Procedures" 
  },
  { 
    id: "Extra Services Config", 
    label: "Extra Services Catalog", 
    description: "Master procedure definitions, workstation room assignments, and base pricing", 
    category: "Clinical & Procedures" 
  },
  { 
    id: "Lab Operations", 
    label: "Laboratory Queue & Outside Tests", 
    description: "In-house lab queue, outside center dispatch (Asiri, Nawaloka), and report publishing", 
    category: "Clinical & Procedures" 
  },
  { 
    id: "Lab Tests", 
    label: "Lab Templates & Profiles", 
    description: "Master test profiles, reference ranges, specimen rules, and pricing catalogs", 
    category: "Clinical & Procedures" 
  },
  { 
    id: "Consultations", 
    label: "Doctor Consultations & Prescriptions", 
    description: "OPD and specialist consultations, digital prescriptions, and doctor fee input", 
    category: "Clinical & Procedures" 
  },

  // Frontdesk & Billing
  { 
    id: "Frontdesk", 
    label: "Front Desk & Queue Tokens", 
    description: "Walk-in & phone appointments, queue tokens, doctor schedule, and arrival tracking", 
    category: "Frontdesk & Billing" 
  },
  { 
    id: "Billing", 
    label: "Centralized & POS Billing", 
    description: "Invoice generation, payment settlements, cashier drawer, and pharmacy POS checkout", 
    category: "Frontdesk & Billing" 
  },
  { 
    id: "Refunds", 
    label: "Refund Management & Vouchers", 
    description: "Issue patient refunds for cancelled visits, test refunds, and thermal refund receipts", 
    category: "Frontdesk & Billing" 
  },
  { 
    id: "Doctor Share", 
    label: "Doctor Share & Payouts", 
    description: "Doctor commission tracking, payout sheets, hospital share deductions, and settlement receipts", 
    category: "Frontdesk & Billing" 
  },

  // Management & Governance
  { 
    id: "Finance", 
    label: "Finance & Accounts", 
    description: "Hospital revenue analytics, expense tracking, doctor settlement sheets, and income ledgers", 
    category: "Management & Governance" 
  },
  { 
    id: "HR", 
    label: "HR, Leaves & Payroll", 
    description: "Staff attendance, biometric logs, leave requests, salary structures, and payroll engine", 
    category: "Management & Governance" 
  },
  { 
    id: "Inventory", 
    label: "Pharmacy Stock & Inventory", 
    description: "Medicine stock levels, purchase orders, batches, expiry alerts, and supplier management", 
    category: "Management & Governance" 
  },
  { 
    id: "Staff", 
    label: "Employee & Doctor Directory", 
    description: "Staff profiles, role assignments, doctor commission overrides, and system credentials", 
    category: "Management & Governance" 
  },
  { 
    id: "Departments", 
    label: "Departments & Commissions", 
    description: "Hospital clinical departments, doctor specialities, and base hospital commission %", 
    category: "Management & Governance" 
  },
  { 
    id: "Rooms", 
    label: "Room & Station Management", 
    description: "Consultation rooms, lab testing stations, procedure rooms, and thermal room callouts", 
    category: "Management & Governance" 
  },

  // System Administration
  { 
    id: "Settings", 
    label: "Hospital System Settings", 
    description: "Hospital branding, receipt printers, thermal auto-cut, timezone, and global parameters", 
    category: "System Administration" 
  },
  { 
    id: "RBAC", 
    label: "Access Control & Role Matrix", 
    description: "Dynamic role creation, permission mapping, and system security privileges", 
    category: "System Administration" 
  },
];

const CATEGORY_ICONS: Record<string, any> = {
  "Clinical & Procedures": ActivitySquare,
  "Frontdesk & Billing": CreditCard,
  "Management & Governance": Building2,
  "System Administration": Settings2,
};

export default function RBACMatrixPage() {
  const [data, setData] = useState<RoleRbac[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const { token } = useAuth();
  
  // Local state for the currently selected role's permissions
  const [currentPermissions, setCurrentPermissions] = useState<Record<string, Permissions>>({});

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API}/admin/roles`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const d = await res.json();
      
      if (!res.ok) throw new Error(d.error || d.message || "Failed to load roles");

      if (d.success) {
        const parsedData = d.data.map((role: any) => {
          const perms: Record<string, Permissions> = {};
          SYSTEM_MODULES.forEach(f => {
            perms[f.id] = { create: false, read: false, update: false, delete: false };
          });
          
          // Map flat permissions to object
          if (role.RolePermission) {
            role.RolePermission.forEach((rp: any) => {
              const rawAction = rp.Permission?.action?.toUpperCase();
              const action = rp.Permission?.action?.toLowerCase() as keyof Permissions;
              const resource = rp.Permission?.resource;
              if (perms[resource] && (action === "create" || action === "read" || action === "update" || action === "delete")) {
                perms[resource][action] = true;
              } else if (rawAction === "ALL") {
                if (resource === "ALL") {
                  SYSTEM_MODULES.forEach(f => {
                    perms[f.id] = { create: true, read: true, update: true, delete: true };
                  });
                } else if (perms[resource]) {
                  perms[resource] = { create: true, read: true, update: true, delete: true };
                }
              }
            });
          }
          return {
            id: role.id,
            name: role.name,
            permissions: perms
          };
        });
        setData(parsedData);
        if (parsedData.length > 0 && !selectedRoleId) {
          setSelectedRoleId(parsedData[0].id);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoles();
    }
  }, [token]);

  useEffect(() => {
    if (!loading && data.length > 0 && selectedRoleId) {
      const roleData = data.find(r => r.id === selectedRoleId);
      
      const initialPerms: Record<string, Permissions> = {};
      SYSTEM_MODULES.forEach(feature => {
        if (roleData?.permissions?.[feature.id]) {
          initialPerms[feature.id] = { ...roleData.permissions[feature.id] };
        } else {
          initialPerms[feature.id] = { create: false, read: false, update: false, delete: false };
        }
      });
      setCurrentPermissions(initialPerms);
    }
  }, [selectedRoleId, data, loading]);

  const handleToggle = (featureId: string, action: keyof Permissions) => {
    setCurrentPermissions(prev => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        [action]: !prev[featureId]?.[action]
      }
    }));
  };

  const handleCategorySelectAll = (category: string, enable: boolean) => {
    const modules = SYSTEM_MODULES.filter(m => m.category === category);
    setCurrentPermissions(prev => {
      const next = { ...prev };
      modules.forEach(m => {
        next[m.id] = {
          create: enable,
          read: enable,
          update: enable,
          delete: enable,
        };
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    
    // Flatten permissions array
    const flatPermissions: {action: string, resource: string}[] = [];
    Object.keys(currentPermissions).forEach(featureId => {
      const p = currentPermissions[featureId];
      if (!p) return;
      if (p.create) flatPermissions.push({ action: "CREATE", resource: featureId });
      if (p.read) flatPermissions.push({ action: "READ", resource: featureId });
      if (p.update) flatPermissions.push({ action: "UPDATE", resource: featureId });
      if (p.delete) flatPermissions.push({ action: "DELETE", resource: featureId });
    });

    try {
      const res = await fetch(`${API}/admin/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: flatPermissions })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(`Permissions saved successfully.`);
        // Update local memory
        setData(prev => {
          const newData = [...prev];
          const idx = newData.findIndex(r => r.id === selectedRoleId);
          if (idx > -1) {
            newData[idx].permissions = currentPermissions;
          }
          return newData;
        });
      } else {
        toast.error(resData.error || "Failed to save permissions.");
      }
    } catch (error) {
      toast.error("Network error saving permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    
    try {
      const res = await fetch(`${API}/admin/roles`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoleName.trim() })
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Role created successfully");
        setIsAddRoleOpen(false);
        setNewRoleName("");
        fetchRoles(); // refresh
      } else {
        toast.error(result.error || "Failed to create role");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const currentRoleData = useMemo(() => data.find(r => r.id === selectedRoleId), [data, selectedRoleId]);
  const isSuperadminRole = currentRoleData?.name?.toLowerCase() === "superadmin";

  const categories = useMemo(() => {
    const set = new Set<string>();
    SYSTEM_MODULES.forEach(m => set.add(m.category));
    return Array.from(set);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Access Control Matrix (RBAC)
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure dynamic CRUD permissions across all clinical workstations, procedure queues, billing, and management modules.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsAddRoleOpen(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> New Role
          </Button>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-3 py-1 gap-1">
            <ShieldCheck className="w-3 h-3" /> RBAC Enforced
          </Badge>
          <Button 
            onClick={handleSave} 
            disabled={saving || isSuperadminRole} 
            className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="p-2.5 bg-card text-card-foreground rounded-lg border shadow-sm">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Select Target Role</CardTitle>
              <CardDescription>
                Customize which system operations and dashboards this role is authorized to perform.
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <Select value={selectedRoleId} onValueChange={(val) => val && setSelectedRoleId(val)}>
                <SelectTrigger className="bg-card text-card-foreground font-semibold">
                  <SelectValue placeholder="Select role">
                    {currentRoleData?.name || "Select role"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data.map(r => (
                    <SelectItem key={r.id} value={r.id} className="font-medium">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isSuperadminRole ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 p-4 text-sm text-amber-800 dark:text-amber-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-base mb-0.5">Root Administrator Role</p>
                <p className="text-xs">
                  The <strong>SUPERADMIN</strong> role possesses full unrestricted root permissions across all clinical, billing, and management modules by design.
                </p>
              </div>
              <Badge className="bg-amber-600 text-white border-none uppercase text-[10px]">
                System Protected
              </Badge>
            </div>
          ) : (
            <div className="bg-primary/5 border-b border-primary/10 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Configuring permissions for role: <strong className="text-foreground font-semibold">{currentRoleData?.name || "Selected Role"}</strong>
              </span>
              <span className="italic">
                Changes apply immediately after saving.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[320px] font-bold text-slate-800 dark:text-gray-100">System Feature & Station</TableHead>
                  <TableHead className="w-[280px] font-semibold text-muted-foreground hidden md:table-cell">Scope / Workflow Description</TableHead>
                  <TableHead className="text-center font-bold text-slate-800 dark:text-gray-100 w-24">Create</TableHead>
                  <TableHead className="text-center font-bold text-slate-800 dark:text-gray-100 w-24 bg-blue-500/5">Read / View</TableHead>
                  <TableHead className="text-center font-bold text-slate-800 dark:text-gray-100 w-24">Update</TableHead>
                  <TableHead className="text-center font-bold text-slate-800 dark:text-gray-100 w-24 bg-red-500/5">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const CategoryIcon = CATEGORY_ICONS[category] || ActivitySquare;
                  const categoryModules = SYSTEM_MODULES.filter(m => m.category === category);

                  return (
                    <div key={category} className="contents">
                      <TableRow className="bg-muted/70 hover:bg-muted/70 border-y font-bold">
                        <TableCell colSpan={6} className="py-2.5 px-4 text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <CategoryIcon className="w-4 h-4 text-primary" />
                              {category}
                            </span>
                            {!isSuperadminRole && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleCategorySelectAll(category, true)}
                                  className="h-6 text-[10px] px-2 text-primary hover:text-primary gap-1"
                                >
                                  <CheckCheck className="w-3 h-3" /> Grant All
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleCategorySelectAll(category, false)}
                                  className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" /> Clear
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {categoryModules.map((feature) => (
                        <TableRow key={feature.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 py-3">
                            <div>{feature.label}</div>
                            <span className="text-[11px] font-mono text-muted-foreground md:hidden block mt-0.5">
                              {feature.id}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell py-3">
                            {feature.description}
                          </TableCell>
                          
                          <TableCell className="text-center py-3">
                            <Checkbox 
                              checked={isSuperadminRole ? true : (currentPermissions[feature.id]?.create || false)} 
                              onCheckedChange={() => handleToggle(feature.id, 'create')}
                              disabled={isSuperadminRole}
                              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-border"
                            />
                          </TableCell>
                          
                          <TableCell className="text-center bg-blue-500/5 py-3">
                            <Checkbox 
                              checked={isSuperadminRole ? true : (currentPermissions[feature.id]?.read || false)} 
                              onCheckedChange={() => handleToggle(feature.id, 'read')}
                              disabled={isSuperadminRole}
                              className="data-[state=checked]:bg-primary border-border"
                            />
                          </TableCell>
                          
                          <TableCell className="text-center py-3">
                            <Checkbox 
                              checked={isSuperadminRole ? true : (currentPermissions[feature.id]?.update || false)} 
                              onCheckedChange={() => handleToggle(feature.id, 'update')}
                              disabled={isSuperadminRole}
                              className="data-[state=checked]:bg-amber-600 border-border"
                            />
                          </TableCell>
                          
                          <TableCell className="text-center bg-red-500/5 py-3">
                            <Checkbox 
                              checked={isSuperadminRole ? true : (currentPermissions[feature.id]?.delete || false)} 
                              onCheckedChange={() => handleToggle(feature.id, 'delete')}
                              disabled={isSuperadminRole}
                              className="data-[state=checked]:bg-red-600 border-border"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </div>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddRole}>
            <DialogHeader>
              <DialogTitle>Add New Hospital Role</DialogTitle>
              <DialogDescription>
                Create a customized hospital role (e.g., Procedure Nurse, ECG Technician, Billing Officer).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input 
                  value={newRoleName} 
                  onChange={e => setNewRoleName(e.target.value)} 
                  placeholder="e.g. ECG Technician" 
                  required 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddRoleOpen(false)}>Cancel</Button>
              <Button type="submit">Create Role</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
