"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MoreHorizontal, Edit, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  roomNumber?: string;
  specialty?: string;
  title?: string;
  departmentId?: string;
  departmentName?: string;
  consultationFee?: number;
  feeType?: string;
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<{id: string, name: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleName: "RECEPTIONIST",
    specialty: "",
    roomNumber: "",
    title: "Dr.",
    departmentId: "",
    consultationFee: 2500,
    feeType: "POST"
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
      setDepartments(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    Promise.all([fetchStaff(), fetchRoles(), fetchDepartments()]).finally(() => setLoading(false));
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      name: "", email: "", password: "", roleName: "RECEPTIONIST", 
      specialty: "", roomNumber: "", title: "Dr.", departmentId: "", 
      consultationFee: 2500, feeType: "POST" 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member: Staff) => {
    setEditingId(member.id);
    setFormData({ 
      name: member.name, 
      email: member.email, 
      password: "", 
      roleName: member.role, 
      specialty: member.specialty || "", 
      roomNumber: member.roomNumber || "",
      title: member.title || "Dr.",
      departmentId: member.departmentId || "",
      consultationFee: member.consultationFee || 2500,
      feeType: member.feeType || "POST"
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
        body: JSON.stringify(formData)
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

  const filteredStaff = staff.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Staff Management</h2>
          <p className="text-muted-foreground mt-1">Manage hospital employees, roles, and access control.</p>
        </div>
        <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add New Staff
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>A comprehensive list of all registered staff members.</CardDescription>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, or role..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length > 0 ? (
                    filteredStaff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium text-[#3A3435]">{member.name}</TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted/30 text-foreground/80 font-semibold border-border">
                            {member.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {member.role === 'DOCTOR' && (
                            <div className="space-y-1">
                              <div>{member.title} {member.name}</div>
                              <div>Dept: {member.departmentName || 'N/A'}</div>
                              <div>Spec: {member.specialty || 'N/A'}</div>
                              <div>Room: {member.roomNumber || 'N/A'}</div>
                              <div>Fee: Rs. {member.consultationFee} ({member.feeType})</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={member.status === 'ACTIVE' ? "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/10" : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/10"}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
        <DialogContent className="sm:max-w-[425px] max-h-[90dvh] overflow-y-auto overflow-x-hidden">
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
                <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@amaz.com" />
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
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                  {/* Fallbacks if DB has none */}
                  {roles.length === 0 && (
                    <>
                      <option value="Doctor">Doctor</option>
                      <option value="RECEPTIONIST">RECEPTIONIST</option>
                      <option value="ADMIN">ADMIN</option>
                    </>
                  )}
                </select>
              </div>

              {formData.roleName === "Doctor" && (
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
                        required
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
                      <label className="text-sm font-medium">Default Room #</label>
                      <Input value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})} placeholder="101" />
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
