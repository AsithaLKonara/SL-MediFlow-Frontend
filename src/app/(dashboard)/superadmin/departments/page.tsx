"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Edit, Trash2, Plus, DollarSign, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/providers/AuthProvider";
import { AdvancedFilter } from "@/components/ui/advanced-filter";

interface User {
  id: string;
  fullName: string;
  specialty: string | null;
  consultationFee: number;
  feeType: string;
  departmentId: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  Users: User[];
  _count: { Users: number };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState("ALL");

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "", isActive: true });

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
  const [doctorForm, setDoctorForm] = useState({ consultationFee: 2500, feeType: "POST" });
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<User[]>([]);
  const [assignDoctorId, setAssignDoctorId] = useState<string>("");
  
  const [isSavingDept, setIsSavingDept] = useState(false);
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const { token } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API}/admin/departments`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || "Failed to load departments");
      setDepartments(Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []));
    } catch (e: any) {
      toast.error(e.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDoctors = async () => {
    try {
      const res = await fetch(`${API}/admin/departments/doctors`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || "Failed to load doctors");
      setAvailableDoctors(Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []));
    } catch (e: any) {
      toast.error(e.message || "Failed to load doctors");
    }
  };

  const handleSaveDepartment = async () => {
    try {
      if (!deptForm.name.trim()) return toast.error("Name is required");
      
      setIsSavingDept(true);
      const method = editingDept ? "PUT" : "POST";
      const url = editingDept ? `${API}/admin/departments/${editingDept.id}` : `${API}/admin/departments`;
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(deptForm)
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Failed to save department");
      
      toast.success(`Department ${editingDept ? "updated" : "created"}`);
      setIsDeptModalOpen(false);
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsSavingDept(false);
    }
  };

  const handleDeleteDepartment = async (id: string, userCount: number) => {
    if (userCount > 0) {
      return toast.error("Cannot delete department with assigned doctors.");
    }
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const res = await fetch(`${API}/admin/departments/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Failed to delete department");
      toast.success("Department deleted");
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete department");
    }
  };

  const handleSaveDoctorFee = async () => {
    if (!selectedDoctor) return;
    try {
      setIsSavingFee(true);
      // Direct call to backend for doctor update
      const res = await fetch(`${API}/admin/departments/doctor/${selectedDoctor.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          consultationFee: doctorForm.consultationFee,
          feeType: doctorForm.feeType
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update fee");
      
      toast.success("Doctor fee updated successfully");
      setIsDoctorModalOpen(false);
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.message || "Failed to update doctor fee");
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleAssignDoctor = async () => {
    if (!assignDoctorId || !activeDeptId) return toast.error("Please select a doctor");
    try {
      setIsAssigning(true);
      const res = await fetch(`${API}/admin/departments/doctor/${assignDoctorId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ departmentId: activeDeptId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Failed to assign doctor");
      
      toast.success("Doctor assigned successfully");
      setIsAssignModalOpen(false);
      setAssignDoctorId("");
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.message || "Failed to assign doctor");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignDoctor = async (doctorId: string) => {
    if (!confirm("Are you sure you want to remove this doctor from the department?")) return;
    try {
      const res = await fetch(`${API}/admin/departments/doctor/${doctorId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ departmentId: null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Failed to remove doctor");
      
      toast.success("Doctor removed from department");
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove doctor");
    }
  };

  const openNewDept = () => {
    setEditingDept(null);
    setDeptForm({ name: "", description: "", isActive: true });
    setIsDeptModalOpen(true);
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || "", isActive: dept.isActive });
    setIsDeptModalOpen(true);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100 dark:text-white">Departments</h2>
          <p className="text-muted-foreground mt-1">Manage hospital departments, doctor assignments, and fees.</p>
        </div>
        <Button onClick={openNewDept} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-card/60 backdrop-blur-sm border-none shadow-sm ring-1 ring-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Departments</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{departments.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-sm border-none shadow-sm ring-1 ring-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Departments</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {departments.filter(d => d.isActive).length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-sm border-none shadow-sm ring-1 ring-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assigned Doctors</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {departments.reduce((acc, curr) => acc + curr._count.Users, 0)}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdvancedFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search departments by name..."
        onClearFilters={() => {
          setSearchQuery("");
          setFilterActive("ALL");
        }}
        onFilterChange={(key, val) => {
          if (key === "active") setFilterActive(val);
        }}
        filters={[
          {
            key: "active",
            label: "Status",
            value: filterActive,
            options: [
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" }
            ]
          }
        ]}
      />

      <div className="grid gap-6">
        {(() => {
          const filteredDepts = departments.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesActive = filterActive === "ALL" || d.isActive.toString() === filterActive;
            return matchesSearch && matchesActive;
          });

          if (filteredDepts.length === 0) {
            return (
              <div className="text-center p-12 bg-card/50 rounded-xl border border-dashed">
                <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No departments match your filters.</p>
              </div>
            );
          }

          return filteredDepts.map((dept) => (
            <Card key={dept.id} className="overflow-hidden border-none shadow-sm ring-1 ring-border bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-3 border-b border-black/5 dark:border-white/10 bg-muted/20 flex flex-row justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2 text-slate-900 dark:text-white">
                      {dept.name}
                      {!dept.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{dept.description || "No description provided"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDept(dept)} className="dark:bg-slate-800 dark:hover:bg-slate-700">
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteDepartment(dept.id, dept._count.Users)} disabled={dept._count.Users > 0}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="bg-background/50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm flex items-center text-slate-900 dark:text-white">
                      <Users className="w-4 h-4 mr-2 text-primary" /> Assigned Doctors ({dept._count.Users})
                    </h4>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => {
                      setActiveDeptId(dept.id);
                      fetchAvailableDoctors();
                      setIsAssignModalOpen(true);
                    }}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Assign Doctor
                    </Button>
                  </div>
                  
                  {!dept.Users || dept.Users.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border dark:border-white/10 rounded-lg bg-muted/10 dark:bg-slate-800/50">No doctors assigned to this department yet.</p>
                  ) : (
                    <div className="rounded-md border dark:border-white/10 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/30 dark:bg-slate-800/50">
                          <TableRow className="dark:border-white/10 border-black/5">
                            <TableHead className="text-slate-700 dark:text-slate-300">Doctor Name</TableHead>
                            <TableHead className="text-slate-700 dark:text-slate-300">Specialty</TableHead>
                            <TableHead className="text-slate-700 dark:text-slate-300">Consultation Fee</TableHead>
                            <TableHead className="text-right text-slate-700 dark:text-slate-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dept.Users.map(doc => (
                            <TableRow key={doc.id} className="dark:border-white/10 border-black/5">
                              <TableCell className="font-medium text-slate-900 dark:text-white">{doc.fullName}</TableCell>
                              <TableCell className="text-slate-600 dark:text-slate-400">{doc.specialty || "General"}</TableCell>
                              <TableCell className="text-slate-600 dark:text-slate-400">Rs. {doc.consultationFee} <span className="text-xs text-muted-foreground ml-1">({doc.feeType === 'UPFRONT' ? 'Upfront' : 'After Consult'})</span></TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="dark:hover:bg-slate-800" onClick={() => {
                                  setSelectedDoctor(doc);
                                  setDoctorForm({ consultationFee: doc.consultationFee, feeType: doc.feeType || "POST" });
                                  setActiveDeptId(dept.id);
                                  setIsDoctorModalOpen(true);
                                }}>
                                  <DollarSign className="w-4 h-4 mr-1" /> Edit Fee
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleUnassignDoctor(doc.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ));
        })()}
      </div>

      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit Department" : "New Department"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={deptForm.name} 
                onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                placeholder="e.g. Cardiology" 
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={deptForm.description} 
                onChange={e => setDeptForm({...deptForm, description: e.target.value})}
                placeholder="Brief description..." 
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <Label>Active Status</Label>
              <Switch 
                checked={deptForm.isActive} 
                onCheckedChange={c => setDeptForm({...deptForm, isActive: c})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeptModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDepartment} isLoading={isSavingDept}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDoctorModalOpen} onOpenChange={setIsDoctorModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Doctor Fee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-muted/30 p-3 rounded-lg mb-2">
              <p className="text-sm text-muted-foreground">Doctor</p>
              <p className="font-medium">{selectedDoctor?.fullName}</p>
            </div>
            <div className="space-y-2">
              <Label>Consultation Fee (Rs.)</Label>
              <Input 
                type="number" 
                value={doctorForm.consultationFee} 
                onChange={e => setDoctorForm({ ...doctorForm, consultationFee: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={doctorForm.feeType}
                onChange={e => setDoctorForm({ ...doctorForm, feeType: e.target.value })}
              >
                <option value="POST">Pay After Consultation (Post)</option>
                <option value="UPFRONT">Pay Before Consultation (Upfront)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDoctorModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDoctorFee} isLoading={isSavingFee}>Update Fee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Doctor to Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select Doctor</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={assignDoctorId}
                onChange={e => setAssignDoctorId(e.target.value)}
              >
                <option value="" disabled>Select a doctor...</option>
                {availableDoctors
                  .filter(doc => doc.departmentId !== activeDeptId) // Only show doctors not already in this department
                  .map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.fullName} ({doc.specialty || 'General'}) {doc.departmentId ? '- Reassign' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignDoctor} isLoading={isAssigning}>Assign Doctor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
