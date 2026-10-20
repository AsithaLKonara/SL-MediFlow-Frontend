"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MoreHorizontal, Edit, Lock, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AdvancedFilter } from "@/components/ui/advanced-filter";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/AuthProvider";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  roomId?: string;
  roomNumber?: string;
  specialty?: string;
  title?: string;
  departmentId?: string;
  departmentName?: string;
  consultationFee?: number | null;
  feeType?: string | null;
  deviceUserId?: string | null;
  commissionRate?: number | null;
  commissionType?: string | null;
}

export default function StaffManagementPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<{id: string, name: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [rooms, setRooms] = useState<{id: string, name: string, department: string, status: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleName: "",
    specialty: "",
    roomId: "",
    title: "Dr.",
    departmentId: "",
    consultationFee: 2500,
    feeType: "POST",
    deviceUserId: "",
    commissionRate: 20,
    commissionType: "PERCENTAGE"
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API}/admin/staff`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to load staff");
      setStaff(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API}/admin/roles`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to load roles");
      setRoles(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API}/admin/departments`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to load departments");
      setDepartments(Array.isArray(data) ? data : (data.data || []));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API}/admin/rooms`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setRooms(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      Promise.all([fetchStaff(), fetchRoles(), fetchDepartments(), fetchRooms()]).finally(() => setLoading(false));
    }
  }, [token]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      name: "", email: "", password: "", roleName: "", 
      specialty: "", roomId: "", title: "Dr.", departmentId: "", 
      consultationFee: 2500, feeType: "POST", deviceUserId: "",
      commissionRate: 20, commissionType: "PERCENTAGE"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member: Staff) => {
    setEditingId(member.id);
    setFormData({ 
      name: member.name, 
      email: member.email.toLowerCase().trim(), 
      password: "", 
      roleName: member.role, 
      specialty: member.specialty || "", 
      roomId: member.roomId || "",
      title: member.title || "Dr.",
      departmentId: member.departmentId || "",
      consultationFee: member.consultationFee || 2500,
      feeType: member.feeType || "POST",
      deviceUserId: member.deviceUserId || "",
      commissionRate: (member.commissionRate !== undefined && member.commissionRate !== null) ? member.commissionRate : 20,
      commissionType: member.commissionType || "PERCENTAGE"
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to suspend/delete ${name}?`)) return;
    try {
      const res = await fetch(`${API}/admin/staff/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`${name} deleted successfully`);
        fetchStaff();
      } else {
        toast.error(data.error || data.message || "Failed to delete staff");
      }
    } catch (e: any) {
      toast.error(e.message || "Network error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editingId ? `${API}/admin/staff/${editingId}` : `${API}/admin/staff`;
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase().trim()
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save");
      }
      
      if (data.success) {
        toast.success(`Staff ${editingId ? "updated" : "added"} successfully`);
        setIsModalOpen(false);
        fetchStaff();
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (e: any) {
      toast.error(e.message || "Network error saving staff");
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "ALL" || member.role === filterRole;
    const matchesDept = filterDepartment === "ALL" || member.departmentId === filterDepartment;
    const matchesStatus = filterStatus === "ALL" || member.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Staff Management</h2>
          <p className="text-muted-foreground mt-1">Manage hospital employees, roles, and access control.</p>
        </div>
        <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add New Staff
        </Button>
      </div>

      <AdvancedFilter
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email, or role..."
        onClearFilters={() => {
          setSearchTerm("");
          setFilterRole("ALL");
          setFilterDepartment("ALL");
          setFilterStatus("ALL");
        }}
        onFilterChange={(key, val) => {
          if (key === "role") setFilterRole(val);
          if (key === "department") setFilterDepartment(val);
          if (key === "status") setFilterStatus(val);
        }}
        filters={[
          {
            key: "role",
            label: "Role",
            value: filterRole,
            options: roles.map(r => ({ value: r.name, label: r.name }))
          },
          {
            key: "department",
            label: "Department",
            value: filterDepartment,
            options: departments.map(d => ({ value: d.id, label: d.name }))
          },
          {
            key: "status",
            label: "Status",
            value: filterStatus,
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "ON_LEAVE", label: "On Leave" },
              { value: "SUSPENDED", label: "Suspended" }
            ]
          }
        ]}
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>A comprehensive list of all registered staff members.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/80 overflow-x-auto shadow-sm bg-card">
              <Table className="min-w-[1050px] w-full table-fixed">
                <TableHeader className="bg-muted/50 whitespace-nowrap">
                  <TableRow>
                    <TableHead className="w-[240px] font-semibold text-foreground">Employee</TableHead>
                    <TableHead className="w-[220px] font-semibold text-foreground">Email</TableHead>
                    <TableHead className="w-[150px] font-semibold text-foreground">Role</TableHead>
                    <TableHead className="w-[260px] font-semibold text-foreground">Department & Assignment</TableHead>
                    <TableHead className="w-[110px] font-semibold text-foreground">Status</TableHead>
                    <TableHead className="w-[70px] text-right font-semibold text-foreground pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length > 0 ? (
                    filteredStaff.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="w-[240px]">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                              {member.name ? member.name.slice(0, 2).toUpperCase() : "ST"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {member.role.toUpperCase() === 'DOCTOR' && member.title ? `${member.title} ` : ''}{member.name}
                              </div>
                              {member.deviceUserId && (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <span>FP ID:</span>
                                  <span className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[10px]">{member.deviceUserId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[220px] text-muted-foreground text-sm">
                          <span className="truncate block" title={member.email}>
                            {member.email}
                          </span>
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <Badge 
                            variant="outline" 
                            className={`font-semibold border text-xs capitalize ${
                              (member.role || '').toUpperCase() === 'DOCTOR'
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/50"
                                : (member.role || '').toUpperCase() === 'NURSE'
                                ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200/50 dark:border-teal-800/50"
                                : (member.role || '').toUpperCase() === 'ADMIN' || (member.role || '').toUpperCase() === 'SUPERADMIN'
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/50"
                                : (member.role || '').toUpperCase() === 'RECEPTIONIST'
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50"
                                : (member.role || '').toUpperCase().includes('LAB')
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/50"
                                : (member.role || '').toUpperCase() === 'PHARMACIST'
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50"
                                : "bg-muted/50 text-foreground/80 border-border"
                            }`}
                          >
                            {(member.role || '').replace('_', ' ').toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[260px]">
                          {member.role.toUpperCase() === 'DOCTOR' ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {member.departmentName && (
                                  <span className="font-medium text-foreground">{member.departmentName}</span>
                                )}
                                {member.specialty && (
                                  <span className="text-muted-foreground">({member.specialty})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                                {member.roomNumber && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-background font-normal border-border">
                                    {member.roomNumber}
                                  </Badge>
                                )}
                                {member.consultationFee != null && !isNaN(Number(member.consultationFee)) && (
                                  <span className="text-[11px]">Rs. {Number(member.consultationFee).toLocaleString()} {member.feeType ? `(${member.feeType})` : ''}</span>
                                )}
                                {member.commissionRate != null && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-purple-500/5 text-purple-700 dark:text-purple-300 border-purple-200">
                                    Comm: {member.commissionType === "FLAT" ? `LKR ${member.commissionRate}` : `${member.commissionRate}%`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {member.departmentName ? (
                                <span className="font-medium text-foreground/80">{member.departmentName}</span>
                              ) : (
                                <span className="text-muted-foreground/60 italic">General Staff</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[110px]">
                          {member.status === 'ACTIVE' ? (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-xs gap-1.5 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </Badge>
                          ) : member.status === 'ON_LEAVE' ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium text-xs gap-1.5 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              On Leave
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium text-xs gap-1.5 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              {(member.status || 'INACTIVE').replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-[70px] text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="outline-none">
                              <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <div className="px-2 py-1.5 text-sm font-semibold">Actions</div>
                              <DropdownMenuItem onClick={() => openEditModal(member)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/superadmin/staff/${member.id}/payroll`)}>
                                <WalletCards className="w-4 h-4 mr-2" /> Payroll Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(member.id, member.name)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Suspend Access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No staff members found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update the details of the staff member below." : "Enter the details for the new staff member."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input 
                  required 
                  type="email" 
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value.toLowerCase().trim()})} 
                  placeholder="john@amaz.com" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password {editingId && "(Leave blank to keep unchanged)"}</label>
                <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" required={!editingId} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.roleName} 
                  onChange={e => setFormData({...formData, roleName: e.target.value})}
                  required
                >
                  <option value="" disabled>Select a Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                  {/* Fallbacks if DB has none */}
                  {roles.length === 0 && (
                    <>
                      <option value="Doctor">Doctor</option>
                      <option value="Receptionist">Receptionist</option>
                      <option value="Admin">Admin</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fingerprint Device ID</label>
                <Input value={formData.deviceUserId} onChange={e => setFormData({...formData, deviceUserId: e.target.value})} placeholder="e.g. 1005 (Leave blank if not registered)" />
                <p className="text-xs text-muted-foreground">The short ID assigned by the Realand fingerprint machine</p>
              </div>

              {formData.roleName.toUpperCase() === "DOCTOR" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      >
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Department</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.departmentId} 
                        onChange={e => setFormData({...formData, departmentId: e.target.value})}
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Specialty</label>
                      <Input value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="General" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Default Room</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.roomId} 
                        onChange={e => setFormData({...formData, roomId: e.target.value})}
                      >
                        <option value="">No Room Assigned</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.department})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Consultation Fee</label>
                      <Input type="number" value={formData.consultationFee} onChange={e => setFormData({...formData, consultationFee: parseFloat(e.target.value) || 0})} placeholder="2500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fee Type</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.feeType} 
                        onChange={e => setFormData({...formData, feeType: e.target.value})}
                      >
                        <option value="POST">POST (After checkup)</option>
                        <option value="UPFRONT">UPFRONT (Before checkup)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3 p-3.5 bg-muted/40 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Hospital Doctor Commission</label>
                      <div className="flex items-center gap-1 bg-background p-1 rounded-md border text-xs">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, commissionType: "PERCENTAGE" })}
                          className={`px-2.5 py-1 rounded font-medium transition-colors ${formData.commissionType === "PERCENTAGE" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          data-testid="comm-type-percent"
                        >
                          % Percentage
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, commissionType: "FLAT" })}
                          className={`px-2.5 py-1 rounded font-medium transition-colors ${formData.commissionType === "FLAT" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          data-testid="comm-type-flat"
                        >
                          Flat Fee (LKR)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">
                        {formData.commissionType === "FLAT" ? "Flat Amount Retained by Hospital per Consultation (LKR)" : "Commission Percentage (%)"}
                      </label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          min="0"
                          max={formData.commissionType === "PERCENTAGE" ? 100 : undefined}
                          step={formData.commissionType === "PERCENTAGE" ? "0.5" : "50"}
                          value={formData.commissionRate} 
                          onChange={e => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})} 
                          placeholder={formData.commissionType === "FLAT" ? "500" : "20"} 
                          data-testid="input-commission-rate"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-semibold text-muted-foreground pointer-events-none">
                          {formData.commissionType === "FLAT" ? "LKR / patient" : "%"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.commissionType === "FLAT" 
                          ? "Hospital retains a fixed flat fee per patient consultation. (Doctor Payout = Consultation Fee - Flat Amount)" 
                          : "Percentage hospital retains. (Doctor Payout = Consultation Fee - Hospital Commission %)"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={saving}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
