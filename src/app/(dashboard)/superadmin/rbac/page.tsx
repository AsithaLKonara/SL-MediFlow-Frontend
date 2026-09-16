"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShieldCheck, Save, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Permissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

interface RoleRbac {
  role: string;
  permissions: Record<string, Permissions>;
}

const ROLES = ["receptionist", "doctor", "pharmacist", "labtech", "cashier"];

const DEFAULT_FEATURES = [
  "Patient Registration", "Queue Management", "Consultation", 
  "Prescribe Medicine", "Request Lab", "Manage Inventory",
  "Fulfill Prescription", "Generate Bill", "View Requests",
  "Enter Results", "Publish Report", "Process Payments",
  "View Finance", "Manage Staff", "System Settings"
];

export default function RBACMatrixPage() {
  const [data, setData] = useState<RoleRbac[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("receptionist");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for the currently selected role's permissions
  const [currentPermissions, setCurrentPermissions] = useState<Record<string, Permissions>>({});

  useEffect(() => {
    fetch("/api/admin/rbac").then(r => r.json()).then(d => {
      setData(d.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading && data.length > 0) {
      const roleData = data.find(r => r.role === selectedRole);
      
      // Initialize with default features if none exist for the role,
      // or merge with existing.
      const initialPerms: Record<string, Permissions> = {};
      DEFAULT_FEATURES.forEach(feature => {
        if (roleData?.permissions?.[feature]) {
          initialPerms[feature] = { ...roleData.permissions[feature] };
        } else {
          initialPerms[feature] = { create: false, read: false, update: false, delete: false };
        }
      });
      setCurrentPermissions(initialPerms);
    }
  }, [selectedRole, data, loading]);

  const handleToggle = (feature: string, action: keyof Permissions) => {
    setCurrentPermissions(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        [action]: !prev[feature][action]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, permissions: currentPermissions })
      });
      if (res.ok) {
        toast.success(`${selectedRole.toUpperCase()} permissions saved successfully.`);
        // Update local memory data so switching back and forth keeps changes
        setData(prev => {
          const newData = [...prev];
          const idx = newData.findIndex(r => r.role === selectedRole);
          if (idx > -1) {
            newData[idx].permissions = currentPermissions;
          } else {
            newData.push({ role: selectedRole, permissions: currentPermissions });
          }
          return newData;
        });
      }
    } catch (error) {
      toast.error("Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Access Control Matrix</h2>
          <p className="text-muted-foreground mt-1">Dynamically assign system features (CRUD) to different hospital roles.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-3 py-1 gap-1">
            <ShieldCheck className="w-3 h-3" /> RBAC Enforced
          </Badge>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-card text-card-foreground rounded-lg border shadow-sm">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Select Target Role</CardTitle>
              <CardDescription>Configure which sidebar features this role can access.</CardDescription>
            </div>
            <div className="w-64">
              <Select value={selectedRole} onValueChange={(val) => val && setSelectedRole(val)}>
                <SelectTrigger className="bg-card text-card-foreground">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px] font-semibold text-[#3A3435]">System Feature</TableHead>
                <TableHead className="text-center font-semibold text-[#3A3435]">Create</TableHead>
                <TableHead className="text-center font-semibold text-[#3A3435]">Read / View</TableHead>
                <TableHead className="text-center font-semibold text-[#3A3435]">Update</TableHead>
                <TableHead className="text-center font-semibold text-[#3A3435]">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEFAULT_FEATURES.map((feature) => (
                <TableRow key={feature} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{feature}</TableCell>
                  
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={currentPermissions[feature]?.create || false} 
                      onCheckedChange={() => handleToggle(feature, 'create')}
                      className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-border"
                    />
                  </TableCell>
                  
                  <TableCell className="text-center bg-blue-500/10/30">
                    <Checkbox 
                      checked={currentPermissions[feature]?.read || false} 
                      onCheckedChange={() => handleToggle(feature, 'read')}
                      className="data-[state=checked]:bg-primary border-border"
                    />
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={currentPermissions[feature]?.update || false} 
                      onCheckedChange={() => handleToggle(feature, 'update')}
                      className="data-[state=checked]:bg-amber-600 border-border"
                    />
                  </TableCell>
                  
                  <TableCell className="text-center bg-red-500/10/30">
                    <Checkbox 
                      checked={currentPermissions[feature]?.delete || false} 
                      onCheckedChange={() => handleToggle(feature, 'delete')}
                      className="data-[state=checked]:bg-red-600 border-border"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
