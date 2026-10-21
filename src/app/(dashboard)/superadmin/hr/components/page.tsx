"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Settings2, Users, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface RolePayrollTemplate {
  id: string;
  role: string;
  workingHoursPerDay: number;
  perHourRate: number;
  otRate: number;
  allowedLeavesPerMonth: number;
  advancePayDate: number | null;
  fullSalaryPayDate: number | null;
}

export default function RolePayrollTemplatesPage() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<RolePayrollTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<RolePayrollTemplate>>({
    role: "Doctor",
    workingHoursPerDay: 8,
    perHourRate: 0,
    otRate: 0,
    allowedLeavesPerMonth: 2,
    advancePayDate: 10,
    fullSalaryPayDate: 30
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (token) fetchTemplates();
  }, [token]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/hr/role-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTemplates(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch role templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the payroll template for ${roleName}?`)) return;
    try {
      const res = await fetch(`${API}/hr/role-templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete template");
      }
      toast.success("Role template deleted successfully");
      if (isModalOpen && form.id === id) {
        setIsModalOpen(false);
      }
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete template");
    }
  };

  const handleSave = async () => {
    if (!form.role) return toast.error("Role is required");
    try {
      // Ensure numeric fields are numbers
      const payload = {
        ...form,
        workingHoursPerDay: Number(form.workingHoursPerDay),
        perHourRate: Number(form.perHourRate),
        otRate: Number(form.otRate),
        allowedLeavesPerMonth: Number(form.allowedLeavesPerMonth),
        advancePayDate: form.advancePayDate ? Number(form.advancePayDate) : null,
        fullSalaryPayDate: form.fullSalaryPayDate ? Number(form.fullSalaryPayDate) : null,
      };

      const res = await fetch(`${API}/hr/role-templates${form.id ? `/${form.id}` : ''}`, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Template ${form.id ? 'updated' : 'created'}`);
        setIsModalOpen(false);
        fetchTemplates();
      } else {
        throw new Error(data.error || "Failed to save template");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100 flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Role Payroll Templates
          </h2>
          <p className="text-muted-foreground mt-1">Define global payroll settings and rates based on employee roles.</p>
        </div>
        <Button onClick={() => {
          setForm({ role: "Doctor", workingHoursPerDay: 8, perHourRate: 0, otRate: 0, allowedLeavesPerMonth: 2, advancePayDate: 10, fullSalaryPayDate: 30 });
          setIsModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" /> New Role Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Working Hours/Day</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>OT Rate</TableHead>
                <TableHead>Allowed Leaves/Mo</TableHead>
                <TableHead>Advance Date</TableHead>
                <TableHead>Full Salary Date</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No templates defined.</TableCell></TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold">{t.role}</TableCell>
                    <TableCell>{t.workingHoursPerDay} hrs</TableCell>
                    <TableCell>Rs. {t.perHourRate.toFixed(2)}</TableCell>
                    <TableCell>Rs. {t.otRate.toFixed(2)}</TableCell>
                    <TableCell>{t.allowedLeavesPerMonth}</TableCell>
                    <TableCell>{t.advancePayDate ? `Day ${t.advancePayDate}` : "-"}</TableCell>
                    <TableCell>{t.fullSalaryPayDate ? `Day ${t.fullSalaryPayDate}` : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400"
                          onClick={() => {
                            setForm(t);
                            setIsModalOpen(true);
                          }}
                          title="Edit Template"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(t.id, t.role)}
                          title="Delete Template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit' : 'Add'} Role Payroll Template</DialogTitle>
            <DialogDescription>Define standard payroll calculation rules for a specific role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role as string | undefined} onValueChange={(v) => setForm({...form, role: v as string})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Nurse">Nurse</SelectItem>
                    <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="Receptionist">Receptionist</SelectItem>
                    <SelectItem value="Lab Technician">Lab Technician</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allowed Leaves Count (Per Month)</Label>
                <Input type="number" min={0} value={form.allowedLeavesPerMonth} onChange={(e) => setForm({...form, allowedLeavesPerMonth: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label>Working Hours (Per Day)</Label>
                <Input type="number" step="0.5" min={1} value={form.workingHoursPerDay} onChange={(e) => setForm({...form, workingHoursPerDay: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Per Hour Rate (Rs.)</Label>
                <Input type="number" min={0} value={form.perHourRate} onChange={(e) => setForm({...form, perHourRate: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>OT Rate (Rs.)</Label>
                <Input type="number" min={0} value={form.otRate} onChange={(e) => setForm({...form, otRate: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label>Salary Advance Date (Day of Month)</Label>
                <Input type="number" min={1} max={31} placeholder="e.g. 10" value={form.advancePayDate || ""} onChange={(e) => setForm({...form, advancePayDate: parseInt(e.target.value) || null})} />
              </div>
              <div className="space-y-2">
                <Label>Full Salary Pay Date (Day of Month)</Label>
                <Input type="number" min={1} max={31} placeholder="e.g. 30" value={form.fullSalaryPayDate || ""} onChange={(e) => setForm({...form, fullSalaryPayDate: parseInt(e.target.value) || null})} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
            {form.id ? (
              <Button 
                variant="destructive" 
                onClick={() => handleDelete(form.id!, form.role || "this role")}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Template
              </Button>
            ) : <div />}
            <div className="flex gap-2 justify-end w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Template</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
