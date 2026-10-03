"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Save, Users, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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

const DEFAULT_FEATURES = [
  "Patient Registration", "Queue Management", "Consultation", 
  "Prescribe Medicine", "Request Lab", "Manage Inventory",
  "Fulfill Prescription", "Generate Bill", "View Requests",
  "Enter Results", "Publish Report", "Process Payments",
  "View Finance", "Manage Staff", "System Settings"
];

export default function RBACMatrixPage() {
  const [data, setData] = useState<RoleRbac[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // Local state for the currently selected role's permissions
  const [currentPermissions, setCurrentPermissions] = useState<Record<string, Permissions>>({});

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchRoles = () => {
    fetch(`${API}/admin/roles`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const parsedData = d.data.map((role: any) => {
            const perms: Record<string, Permissions> = {};
            DEFAULT_FEATURES.forEach(f => {
              perms[f] = { create: false, read: false, update: false, delete: false };
            });
            
            // Map flat permissions to object
            if (role.RolePermission) {
              role.RolePermission.forEach((rp: any) => {
                const action = rp.Permission.action.toLowerCase() as keyof Permissions;
                const resource = rp.Permission.resource;
                if (perms[resource]) {
                  perms[resource][action] = true;
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
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load roles");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (!loading && data.length > 0 && selectedRoleId) {
      const roleData = data.find(r => r.id === selectedRoleId);
      
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
  }, [selectedRoleId, data, loading]);

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
    if (!selectedRoleId) return;
    setSaving(true);
    
    // Flatten permissions array
    const flatPermissions: {action: string, resource: string}[] = [];
    Object.keys(currentPermissions).forEach(feature => {
      if (currentPermissions[feature].create) flatPermissions.push({ action: "CREATE", resource: feature });
      if (currentPermissions[feature].read) flatPermissions.push({ action: "READ", resource: feature });
      if (currentPermissions[feature].update) flatPermissions.push({ action: "UPDATE", resource: feature });
      if (currentPermissions[feature].delete) flatPermissions.push({ action: "DELETE", resource: feature });
    });

    try {
      const res = await fetch(`${API}/admin/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
          <Button onClick={() => setIsAddRoleOpen(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> New Role
          </Button>
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
              <Select value={selectedRoleId} onValueChange={(val) => val && setSelectedRoleId(val)}>
                <SelectTrigger className="bg-card text-card-foreground">
                  <SelectValue placeholder="Select role">
                    {data.find(r => r.id === selectedRoleId)?.name || "Select role"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
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

      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddRole}>
            <DialogHeader>
              <DialogTitle>Add New Role</DialogTitle>
              <DialogDescription>
                Create a new system role. You can configure its permissions later.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input 
                  value={newRoleName} 
                  onChange={e => setNewRoleName(e.target.value)} 
                  placeholder="e.g. NURSE" 
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
