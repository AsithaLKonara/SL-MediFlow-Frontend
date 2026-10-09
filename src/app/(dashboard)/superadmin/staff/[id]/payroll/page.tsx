"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, WalletCards, History, Landmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface PayrollProfile {
  id?: string;
  employmentType: string;
  salaryBasis: string;
  joiningDate: string;
  terminationDate?: string | null;
  paymentMethod: string;
  bankDetails?: string | null;
  compensations?: any[];
  components?: any[];
}

export default function PayrollProfilePage() {
  const { id: userId } = useParams() as { id: string };
  const router = useRouter();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PayrollProfile>({
    employmentType: "FULL_TIME",
    salaryBasis: "MONTHLY",
    joiningDate: new Date().toISOString().split('T')[0],
    terminationDate: "",
    paymentMethod: "BANK_TRANSFER",
    bankDetails: "",
  });
  const [baseSalary, setBaseSalary] = useState<number | "">("");

  // Components State
  const [globalComponents, setGlobalComponents] = useState<any[]>([]);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [componentForm, setComponentForm] = useState({
    componentId: "",
    value: "",
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchGlobalComponents();
    }
  }, [token]);

  const fetchGlobalComponents = async () => {
    try {
      const res = await fetch(`${API}/hr/components`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setGlobalComponents(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/hr/employees/${userId}/payroll-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.data) {
        const p = data.data;
        setProfile({
          id: p.id,
          employmentType: p.employmentType,
          salaryBasis: p.salaryBasis,
          joiningDate: p.joiningDate ? p.joiningDate.split('T')[0] : "",
          terminationDate: p.terminationDate ? p.terminationDate.split('T')[0] : "",
          paymentMethod: p.paymentMethod || "BANK_TRANSFER",
          bankDetails: p.bankDetails ? JSON.stringify(p.bankDetails) : "",
          compensations: p.compensations,
          components: p.components
        });
        if (p.compensations && p.compensations.length > 0) {
          setBaseSalary(p.compensations[0].baseSalary);
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to fetch payroll profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      let parsedBankDetails = null;
      if (profile.paymentMethod === "BANK_TRANSFER" && profile.bankDetails) {
        try {
          parsedBankDetails = JSON.parse(profile.bankDetails);
        } catch(e) {
          parsedBankDetails = { text: profile.bankDetails };
        }
      }

      const res = await fetch(`${API}/hr/employees/${userId}/payroll-profile`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...profile,
          bankDetails: parsedBankDetails,
          baseSalary: baseSalary === "" ? undefined : Number(baseSalary)
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Payroll profile saved successfully");
        fetchProfile();
      } else {
        throw new Error(data.error || "Failed to save profile");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAssignComponent = async () => {
    if (!componentForm.componentId) return toast.error("Select a component");
    try {
      const res = await fetch(`${API}/hr/employees/${userId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(componentForm)
      });
      if (res.ok) {
        toast.success("Component assigned");
        setIsComponentModalOpen(false);
        fetchProfile();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveComponent = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this component?")) return;
    try {
      const res = await fetch(`${API}/hr/employees/${userId}/components/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Component deactivated");
        fetchProfile();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100 flex items-center gap-2">
            <WalletCards className="w-8 h-8 text-primary" />
            Payroll Profile Setup
          </h2>
          <p className="text-muted-foreground mt-1">Configure compensation and employment details for this staff member.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
            <CardDescription>Basic configuration for the payroll engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employment Type</label>
              <Select value={profile.employmentType || ""} onValueChange={(v) => setProfile({...profile, employmentType: v || ""})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Salary Basis</label>
              <Select value={profile.salaryBasis || ""} onValueChange={(v) => setProfile({...profile, salaryBasis: v || ""})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly Fixed</SelectItem>
                  <SelectItem value="DAILY">Daily Wage</SelectItem>
                  <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                  <SelectItem value="SHIFT">Shift Based</SelectItem>
                  <SelectItem value="MIXED">Mixed (Basic + Shift)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Joining Date</label>
                <Input type="date" value={profile.joiningDate} onChange={(e) => setProfile({...profile, joiningDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Termination Date</label>
                <Input type="date" value={profile.terminationDate || ""} onChange={(e) => setProfile({...profile, terminationDate: e.target.value})} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compensation & Payment</CardTitle>
            <CardDescription>Base salary and banking information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Base Salary (LKR)</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  className="pl-9" 
                  placeholder="e.g. 150000" 
                  value={baseSalary} 
                  onChange={(e) => setBaseSalary(e.target.value ? Number(e.target.value) : "")} 
                />
              </div>
              {profile.compensations && profile.compensations.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <History className="w-3 h-3" /> 
                  Effective since: {new Date(profile.compensations[0].effectiveFrom).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={profile.paymentMethod || ""} onValueChange={(v) => setProfile({...profile, paymentMethod: v || ""})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {profile.paymentMethod === "BANK_TRANSFER" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Details</label>
                <Input 
                  placeholder="Bank Name, Branch, Account No..." 
                  value={profile.bankDetails || ""} 
                  onChange={(e) => setProfile({...profile, bankDetails: e.target.value})} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assigned Components</CardTitle>
            <CardDescription>Recurring allowances, deductions, and statuatory contributions.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsComponentModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Component
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Value/Override</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!profile.components || profile.components.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No components assigned.</TableCell></TableRow>
              ) : (
                profile.components.map((ec: any) => (
                  <TableRow key={ec.id} className={ec.effectiveTo ? "opacity-50" : ""}>
                    <TableCell className="font-mono font-medium">{ec.component?.code}</TableCell>
                    <TableCell>{ec.component?.name}</TableCell>
                    <TableCell><Badge variant="outline">{ec.component?.category}</Badge></TableCell>
                    <TableCell>{ec.value ? `LKR ${ec.value}` : 'Standard Rate'}</TableCell>
                    <TableCell>{new Date(ec.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell>{ec.effectiveTo ? new Date(ec.effectiveTo).toLocaleDateString() : 'Active'}</TableCell>
                    <TableCell>
                      {!ec.effectiveTo && (
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveComponent(ec.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleSave} className="min-w-[120px] bg-primary text-white">
          <Save className="w-4 h-4 mr-2" /> Save Profile
        </Button>
      </div>
      <Dialog open={isComponentModalOpen} onOpenChange={setIsComponentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Salary Component</DialogTitle>
            <DialogDescription>Attach an allowance or deduction to this employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Global Component</Label>
              <Select value={componentForm.componentId} onValueChange={(v) => setComponentForm({...componentForm, componentId: v || ""})}>
                <SelectTrigger><SelectValue placeholder="Select component..." /></SelectTrigger>
                <SelectContent>
                  {globalComponents.filter(c => c.isActive).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code}) - {c.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Override Value (Optional)</Label>
              <Input 
                type="number" 
                placeholder="Leave blank to use standard rate" 
                value={componentForm.value} 
                onChange={(e) => setComponentForm({...componentForm, value: e.target.value})} 
              />
              <p className="text-xs text-muted-foreground">Required if component calculation method is FIXED but has no default.</p>
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input 
                type="date" 
                value={componentForm.effectiveFrom} 
                onChange={(e) => setComponentForm({...componentForm, effectiveFrom: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComponentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignComponent}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
