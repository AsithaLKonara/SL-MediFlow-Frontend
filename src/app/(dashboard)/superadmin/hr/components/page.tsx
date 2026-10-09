"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Settings2, ShieldCheck, Banknote } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SalaryComponent {
  id: string;
  code: string;
  name: string;
  category: string;
  calculationMethod: string;
  isTaxable: boolean;
  isEpfEligible: boolean;
  isActive: boolean;
}

export default function GlobalComponentsPage() {
  const { token } = useAuth();
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "EARNING",
    calculationMethod: "FIXED",
    isTaxable: true,
    isEpfEligible: true
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (token) fetchComponents();
  }, [token]);

  const fetchComponents = async () => {
    try {
      const res = await fetch(`${API}/hr/components`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setComponents(data.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch components");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.code || !form.name) return toast.error("Code and Name are required");
    try {
      const res = await fetch(`${API}/hr/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Component created");
        setIsModalOpen(false);
        fetchComponents();
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case "EARNING": return "bg-green-100 text-green-800";
      case "DEDUCTION": return "bg-red-100 text-red-800";
      case "STATUTORY": return "bg-blue-100 text-blue-800";
      case "EMPLOYER_CONTRIBUTION": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100 flex items-center gap-2">
            <Settings2 className="w-8 h-8 text-primary" />
            Salary Components Dictionary
          </h2>
          <p className="text-muted-foreground mt-1">Define global allowances, deductions, and statutory rules.</p>
        </div>
        <Button onClick={() => {
          setForm({ code: "", name: "", category: "EARNING", calculationMethod: "FIXED", isTaxable: true, isEpfEligible: true });
          setIsModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" /> New Component
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>EPF Eligible</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : components.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No components defined.</TableCell></TableRow>
              ) : (
                components.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell><Badge className={getCategoryColor(c.category)} variant="outline">{c.category}</Badge></TableCell>
                    <TableCell>{c.calculationMethod}</TableCell>
                    <TableCell>{c.isTaxable ? <ShieldCheck className="w-4 h-4 text-green-600" /> : "-"}</TableCell>
                    <TableCell>{c.isEpfEligible ? <ShieldCheck className="w-4 h-4 text-green-600" /> : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "default" : "secondary"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Salary Component</DialogTitle>
            <DialogDescription>Define a new global rule for payroll calculations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code (Unique)</Label>
                <Input placeholder="e.g. TRP_ALLOW" value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g. Transport Allowance" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v || ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EARNING">Earning</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                    <SelectItem value="STATUTORY">Statutory</SelectItem>
                    <SelectItem value="EMPLOYER_CONTRIBUTION">Employer Contribution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calculation Method</Label>
                <Select value={form.calculationMethod} onValueChange={(v) => setForm({...form, calculationMethod: v || ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="HOURLY_MULTIPLIER">Hourly Multiplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-6 mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="taxable" 
                  checked={form.isTaxable} 
                  onCheckedChange={(checked) => setForm({...form, isTaxable: !!checked})}
                />
                <Label htmlFor="taxable">Is Taxable (APIT)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="epf" 
                  checked={form.isEpfEligible} 
                  onCheckedChange={(checked) => setForm({...form, isEpfEligible: !!checked})}
                />
                <Label htmlFor="epf">Is EPF/ETF Eligible</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Component</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
