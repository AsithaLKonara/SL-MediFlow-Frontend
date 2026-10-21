"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sliders, Plus, Edit2, ShieldAlert, Sparkles, Building, Banknote, UserCheck, Trash2, CheckCircle2, UserMinus, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SalaryStructuresPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"staff" | "rules">("staff");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Edit Staff Base Salary & Details
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [staffSalaryData, setStaffSalaryData] = useState({
    baseSalary: "",
    salaryBasis: "MONTHLY",
    paymentMethod: "BANK_TRANSFER",
    bankName: "",
    accountNo: "",
    branch: "",
  });
  const [savingStaff, setSavingStaff] = useState(false);

  // Modal: Assign Component to Specific Staff
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({
    componentId: "",
    value: "",
  });
  const [assigning, setAssigning] = useState(false);

  // Modal: Create or Edit Global / Designation-based Allowance / Deduction Rule
  const [openRuleModal, setOpenRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleFormData, setRuleFormData] = useState({
    code: "",
    name: "",
    category: "EARNING",
    type: "ALLOWANCE",
    calculationMethod: "FIXED",
    defaultAmount: "",
    applicableRoles: "ALL",
    isTaxable: true,
    isEpfEligible: true,
  });
  const [savingRule, setSavingRule] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchData = async () => {
    if (!token) return;
    try {
      const [staffRes, rulesRes] = await Promise.all([
        fetch(`${API}/admin/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/hr/allowance-rules`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const staffData = await staffRes.json();
      const rulesData = await rulesRes.json();

      if (staffRes.ok) setStaffList(staffData.data || staffData.users || []);
      if (rulesRes.ok) setRules(rulesData.data || []);
    } catch (e) {
      toast.error("Failed to load salary structure data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenStaffModal = async (staff: any) => {
    setSelectedStaff(staff);
    try {
      const res = await fetch(`${API}/hr/employees/${staff.id}/payroll-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const p = data.data;
        setStaffProfile(p);
        const currentComp = p.compensations?.[0];
        setStaffSalaryData({
          baseSalary: currentComp ? String(currentComp.baseSalary) : String(staff.basicSalary || ""),
          salaryBasis: p.salaryBasis || "MONTHLY",
          paymentMethod: p.paymentMethod || "BANK_TRANSFER",
          bankName: p.bankDetails?.bankName || "",
          accountNo: p.bankDetails?.accountNo || "",
          branch: p.bankDetails?.branch || "",
        });
      } else {
        setStaffProfile(null);
        setStaffSalaryData({
          baseSalary: String(staff.basicSalary || ""),
          salaryBasis: "MONTHLY",
          paymentMethod: "BANK_TRANSFER",
          bankName: "",
          accountNo: "",
          branch: "",
        });
      }
    } catch (e) {
      console.error(e);
      setStaffProfile(null);
    }
  };

  const handleSaveStaffProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setSavingStaff(true);
    try {
      const res = await fetch(`${API}/hr/employees/${selectedStaff.id}/payroll-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          baseSalary: parseFloat(staffSalaryData.baseSalary) || 0,
          salaryBasis: staffSalaryData.salaryBasis,
          employmentType: "FULL_TIME",
          paymentMethod: staffSalaryData.paymentMethod,
          bankDetails: {
            bankName: staffSalaryData.bankName,
            accountNo: staffSalaryData.accountNo,
            branch: staffSalaryData.branch,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Salary profile updated for ${selectedStaff.fullName || selectedStaff.name}`);
        setSelectedStaff(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving profile");
    } finally {
      setSavingStaff(false);
    }
  };

  const handleAssignComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !assignData.componentId) return;
    setAssigning(true);
    try {
      const res = await fetch(`${API}/hr/employees/${selectedStaff.id}/components`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          componentId: assignData.componentId,
          value: assignData.value ? parseFloat(assignData.value) : undefined,
          effectiveFrom: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Allowance/Deduction assigned directly to employee");
        setOpenAssignModal(false);
        setAssignData({ componentId: "", value: "" });
        handleOpenStaffModal(selectedStaff);
      } else {
        toast.error(data.error || "Failed to assign to employee");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // Remove or exempt a designation rule for this specific staff member
  const handleExemptRoleRule = async (componentId: string, ruleName?: string) => {
    if (!selectedStaff) return;
    try {
      const res = await fetch(`${API}/hr/employees/${selectedStaff.id}/components`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          componentId,
          value: 0,
          effectiveFrom: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`"${ruleName || "Rule"}" removed for ${selectedStaff.fullName || selectedStaff.name}`);
        handleOpenStaffModal(selectedStaff);
      } else {
        toast.error(data.error || "Failed to exempt rule for employee");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Restore an exempted designation rule for this employee
  const handleRestoreRoleRule = async (assignmentId: string, ruleName?: string) => {
    if (!selectedStaff) return;
    try {
      const res = await fetch(`${API}/hr/employees/${selectedStaff.id}/components/${assignmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`"${ruleName || "Rule"}" restored to designation default`);
        handleOpenStaffModal(selectedStaff);
      } else {
        toast.error("Failed to restore rule");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Delete a policy rule globally from the hospital
  const handleDeleteRuleGlobally = async (ruleId: string, ruleName?: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete policy rule "${ruleName || "this rule"}"? It will be removed for all staff members.`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/hr/allowance-rules/${ruleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Policy rule "${ruleName || "Rule"}" deleted successfully`);
        await fetchData();
        if (selectedStaff) {
          handleOpenStaffModal(selectedStaff);
        }
      } else {
        toast.error(data.error || "Failed to delete rule");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Remove a specific custom assignment for this employee
  const handleRemoveComponent = async (assignmentId: string, compName?: string) => {
    if (!selectedStaff) return;
    if (!window.confirm(`Remove "${compName || "this allowance/deduction"}" from ${selectedStaff.fullName || selectedStaff.name}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/hr/employees/${selectedStaff.id}/components/${assignmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`"${compName || "Assignment"}" removed`);
        handleOpenStaffModal(selectedStaff);
      } else {
        toast.error("Failed to remove assignment");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenCreateRule = () => {
    setEditingRule(null);
    setRuleFormData({
      code: "",
      name: "",
      category: "EARNING",
      type: "ALLOWANCE",
      calculationMethod: "FIXED",
      defaultAmount: "",
      applicableRoles: "ALL",
      isTaxable: true,
      isEpfEligible: true,
    });
    setOpenRuleModal(true);
  };

  const handleOpenEditRule = (rule: any) => {
    setEditingRule(rule);
    setRuleFormData({
      code: rule.code || "",
      name: rule.name || "",
      category: rule.category || "EARNING",
      type: rule.type || rule.category || "ALLOWANCE",
      calculationMethod: rule.calculationMethod || "FIXED",
      defaultAmount: rule.defaultAmount !== undefined && rule.defaultAmount !== null ? String(rule.defaultAmount) : "",
      applicableRoles: rule.applicableRoles || "ALL",
      isTaxable: rule.isTaxable !== false,
      isEpfEligible: rule.isEpfEligible !== false,
    });
    setOpenRuleModal(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      const url = editingRule
        ? `${API}/hr/allowance-rules/${editingRule.id}`
        : `${API}/hr/allowance-rules`;
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ruleFormData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingRule ? "Policy rule updated successfully" : "New allowance rule created");
        setOpenRuleModal(false);
        setEditingRule(null);
        setRuleFormData({
          code: "",
          name: "",
          category: "EARNING",
          type: "ALLOWANCE",
          calculationMethod: "FIXED",
          defaultAmount: "",
          applicableRoles: "ALL",
          isTaxable: true,
          isEpfEligible: true,
        });
        fetchData();
        if (selectedStaff) {
          handleOpenStaffModal(selectedStaff);
        }
      } else {
        toast.error(data.error || "Failed to save rule");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingRule(false);
    }
  };

  // Filter applicable designation rules for the selected employee
  const applicableRoleRules = selectedStaff
    ? rules.filter((r) => {
        if (r.isActive === false) return false;
        if (r.type === "BASIC" || r.type === "OVERTIME") return false;
        const roles = (r.applicableRoles || "ALL").split(",").map((x: string) => x.trim().toUpperCase());
        const staffRole = (selectedStaff.Role?.name || selectedStaff.role || "").toUpperCase();
        return roles.includes("ALL") || roles.includes(staffRole);
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100 flex items-center gap-2">
            <Sliders className="w-8 h-8 text-primary" /> Staff Salary & Allowance Structures
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure designation-based rules, individual employee assignments, and basic salaries in Sri Lankan Rupees (LKR).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "staff" ? "default" : "outline"}
            onClick={() => setActiveTab("staff")}
            className={activeTab === "staff" ? "bg-primary text-white" : ""}
          >
            Staff Salary Profiles
          </Button>
          <Button
            variant={activeTab === "rules" ? "default" : "outline"}
            onClick={() => setActiveTab("rules")}
            className={activeTab === "rules" ? "bg-primary text-white" : ""}
          >
            Allowance & Deduction Rules
          </Button>
        </div>
      </div>

      {activeTab === "staff" ? (
        <Card>
          <CardHeader>
            <CardTitle>Hospital Staff Salary Configurations</CardTitle>
            <CardDescription>
              Assign basic salaries, configure individual allowances (Transport, Night shift, etc.), and banking details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Role / Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Basic Salary (LKR)</TableHead>
                    <TableHead>Salary Basis</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                        {s.fullName || s.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.Role?.name || s.role || "Staff"}</Badge>
                      </TableCell>
                      <TableCell>{s.Department?.name || "General"}</TableCell>
                      <TableCell className="text-right font-bold text-primary font-mono">
                        {s.basicSalary ? `LKR ${s.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "Not Configured"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Monthly</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleOpenStaffModal(s)}>
                          <Edit2 className="w-3.5 h-3.5" /> Configure Structure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Designation-Based & Global Allowance/Deduction Rules</CardTitle>
              <CardDescription>
                Define hospital-wide policy rules targeted at all employees or specific designations (Nurses, Doctors, etc.).
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreateRule} className="bg-primary text-white gap-2">
              <Plus className="w-4 h-4" /> Add Policy Rule
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Rule Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target Designation</TableHead>
                    <TableHead>Calculation</TableHead>
                    <TableHead className="text-right">Default Value (LKR)</TableHead>
                    <TableHead>EPF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-bold text-xs">{r.code}</TableCell>
                      <TableCell className="font-semibold">{r.name}</TableCell>
                      <TableCell>
                        <Badge variant={r.category === "DEDUCTION" ? "destructive" : "default"}>
                          {r.type || r.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium bg-muted/60">
                          {r.applicableRoles === "ALL" ? "All Designations" : `${r.applicableRoles} Only`}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.calculationMethod}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {r.calculationMethod === "PERCENTAGE" ? `${r.defaultAmount}%` : `LKR ${r.defaultAmount?.toLocaleString()}`}
                      </TableCell>
                      <TableCell>
                        {r.isEpfEligible ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={r.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800"}>
                          {r.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            title="Edit Rule"
                            onClick={() => handleOpenEditRule(r)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete Rule Globally"
                            onClick={() => handleDeleteRuleGlobally(r.id, r.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Salary Configuration Modal */}
      <Dialog open={!!selectedStaff} onOpenChange={(open) => !open && setSelectedStaff(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Salary Structure — {selectedStaff?.fullName || selectedStaff?.name}
            </DialogTitle>
            <DialogDescription>
              Designation: <span className="font-semibold text-foreground">{selectedStaff?.Role?.name || selectedStaff?.role || "Staff"}</span> · Department: {selectedStaff?.Department?.name || "General"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStaffProfile} className="space-y-5 py-2">
            {/* Base Salary & Basis */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Basic Salary (LKR)</label>
                <Input
                  type="number"
                  placeholder="e.g. 45000"
                  value={staffSalaryData.baseSalary}
                  onChange={(e) => setStaffSalaryData({ ...staffSalaryData, baseSalary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Salary Basis</label>
                <Select
                  value={staffSalaryData.salaryBasis}
                  onValueChange={(v) => setStaffSalaryData({ ...staffSalaryData, salaryBasis: v || "MONTHLY" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly Fixed</SelectItem>
                    <SelectItem value="HOURLY">Hourly Shift Basis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Banking Details */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Banking & Disbursement</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Payment Method</label>
                  <Select
                    value={staffSalaryData.paymentMethod}
                    onValueChange={(v) => setStaffSalaryData({ ...staffSalaryData, paymentMethod: v || "BANK_TRANSFER" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Bank Name</label>
                  <Input
                    placeholder="e.g. BOC / Commercial"
                    value={staffSalaryData.bankName}
                    onChange={(e) => setStaffSalaryData({ ...staffSalaryData, bankName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Account Number</label>
                  <Input
                    placeholder="e.g. 8001234567"
                    value={staffSalaryData.accountNo}
                    onChange={(e) => setStaffSalaryData({ ...staffSalaryData, accountNo: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Allowances & Deductions Active for this Staff Member */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    Active Allowances & Deductions
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Combines designation-wide rules and employee-specific assignments.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1 border-primary text-primary"
                  onClick={() => setOpenAssignModal(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> Assign to Employee
                </Button>
              </div>

              {/* Designation-Based Rules (Inherited) */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Designation Rules (Auto-Applied to {selectedStaff?.Role?.name || selectedStaff?.role || "Staff"})
                </span>
                {applicableRoleRules.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded-md">
                    No designation-level rules configured for this role.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {applicableRoleRules.map((r) => {
                      const override = staffProfile?.components?.find(
                        (c: any) => c.componentId === r.id || c.component?.id === r.id
                      );
                      const isExempted = override && Number(override.value) === 0;
                      const hasCustomOverride = override && Number(override.value) > 0;

                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-2.5 rounded-md border text-xs transition-colors ${
                            isExempted
                              ? "bg-muted/20 border-dashed border-muted text-muted-foreground opacity-75"
                              : "bg-muted/40 border-muted/50 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={r.category === "DEDUCTION" ? "destructive" : "default"}
                              className="text-[10px]"
                            >
                              {r.type || r.category}
                            </Badge>
                            <span className={`font-semibold ${isExempted ? "line-through text-muted-foreground" : ""}`}>
                              {r.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              ({r.applicableRoles === "ALL" ? "All Staff" : `${r.applicableRoles} Only`})
                            </span>
                            {isExempted && (
                              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                                Exempted for this Staff
                              </Badge>
                            )}
                            {hasCustomOverride && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                Custom Override
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-semibold ${isExempted ? "line-through text-muted-foreground" : ""}`}>
                              {hasCustomOverride
                                ? `LKR ${override.value?.toLocaleString()}`
                                : r.calculationMethod === "PERCENTAGE"
                                ? `${r.defaultAmount}% of Basic`
                                : `LKR ${r.defaultAmount?.toLocaleString()}`}
                            </span>
                            <div className="flex items-center gap-1">
                              {isExempted ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200 gap-1"
                                  title="Restore designation rule for this employee"
                                  onClick={() => handleRestoreRoleRule(override.id, r.name)}
                                >
                                  <RotateCcw className="w-3 h-3" /> Restore
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1"
                                  title="Remove / exempt for this employee only"
                                  onClick={() => handleExemptRoleRule(r.id, r.name)}
                                >
                                  <UserMinus className="w-3 h-3" /> Remove for Employee
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete policy rule globally from hospital"
                                onClick={() => handleDeleteRuleGlobally(r.id, r.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Employee-Specific Assignments */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Employee-Specific Custom Assignments
                </span>
                {(!staffProfile?.components ||
                  staffProfile.components.filter((ec: any) => Number(ec.value) > 0).length === 0) ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-md">
                    No custom overrides or individual items assigned. This staff member receives the standard designation rules above.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {staffProfile.components
                      .filter((ec: any) => Number(ec.value) > 0)
                      .map((ec: any) => (
                        <div
                          key={ec.id}
                          className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-primary/50 text-primary text-[10px]">
                              {ec.component?.category === "DEDUCTION" ? "Deduction" : "Allowance"}
                            </Badge>
                            <span className="font-semibold text-foreground">
                              {ec.component?.name || "Custom Component"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary">
                              LKR {(ec.value !== null && ec.value !== undefined ? ec.value : ec.component?.defaultAmount)?.toLocaleString()}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                              title="Remove custom assignment"
                              onClick={() => handleRemoveComponent(ec.id, ec.component?.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setSelectedStaff(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingStaff} className="bg-primary text-white">
                {savingStaff ? "Saving..." : "Save Salary Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Specific Allowance / Deduction to Employee Dialog */}
      <Dialog open={openAssignModal} onOpenChange={setOpenAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Specific Employee</DialogTitle>
            <DialogDescription>
              Assign an allowance or deduction directly to {selectedStaff?.fullName || selectedStaff?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignComponent} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Allowance / Deduction</label>
              <Select
                value={assignData.componentId}
                onValueChange={(v) => setAssignData({ ...assignData, componentId: v || "" })}
              >
                <SelectTrigger><SelectValue placeholder="Choose rule..." /></SelectTrigger>
                <SelectContent>
                  {rules.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.category}) — Default: LKR {r.defaultAmount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Custom Amount (LKR) / Override (Optional)</label>
              <Input
                type="number"
                placeholder="Leave blank to use default rule amount"
                value={assignData.value}
                onChange={(e) => setAssignData({ ...assignData, value: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                If entered, this amount will override the rule default for this specific employee.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenAssignModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assigning} className="bg-primary text-white">
                {assigning ? "Assigning..." : "Assign to Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Allowance / Deduction Rule Dialog */}
      <Dialog
        open={openRuleModal}
        onOpenChange={(open) => {
          setOpenRuleModal(open);
          if (!open) setEditingRule(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Allowance / Deduction Rule" : "Add Allowance / Deduction Rule"}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? `Update configuration and amounts for "${editingRule.name}".`
                : "Create a policy rule targeted to all staff or a specific designation."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rule Code</label>
                <Input
                  placeholder="e.g. NIGHT_ALLOWANCE"
                  value={ruleFormData.code}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rule Name</label>
                <Input
                  placeholder="e.g. Night Shift Allowance"
                  value={ruleFormData.name}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Target Designation Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Designation / Category</label>
              <Select
                value={ruleFormData.applicableRoles}
                onValueChange={(v) => setRuleFormData({ ...ruleFormData, applicableRoles: v || "ALL" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Designations (Hospital-Wide)</SelectItem>
                  <SelectItem value="Nurse">Nurses Only</SelectItem>
                  <SelectItem value="Doctor">Doctors Only</SelectItem>
                  <SelectItem value="Receptionist">Receptionists Only</SelectItem>
                  <SelectItem value="LabTech">Lab Technicians Only</SelectItem>
                  <SelectItem value="Cashier">Cashiers Only</SelectItem>
                  <SelectItem value="Pharmacist">Pharmacists Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={ruleFormData.category}
                  onValueChange={(v) => setRuleFormData({ ...ruleFormData, category: v || "EARNING", type: v === "DEDUCTION" ? "DEDUCTION" : "ALLOWANCE" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EARNING">Earning (Allowance/Bonus)</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Default Amount / Value (LKR)</label>
                <Input
                  type="number"
                  placeholder="e.g. 3000"
                  value={ruleFormData.defaultAmount}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, defaultAmount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Calculation Method</label>
                <Select
                  value={ruleFormData.calculationMethod}
                  onValueChange={(v) => setRuleFormData({ ...ruleFormData, calculationMethod: v || "FIXED" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount (LKR)</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage of Basic (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">EPF Eligible</label>
                <Select
                  value={ruleFormData.isEpfEligible ? "YES" : "NO"}
                  onValueChange={(v) => setRuleFormData({ ...ruleFormData, isEpfEligible: v === "YES" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes (Include in EPF/ETF)</SelectItem>
                    <SelectItem value="NO">No (Exempt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenRuleModal(false);
                  setEditingRule(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingRule} className="bg-primary text-white">
                {savingRule ? "Saving..." : (editingRule ? "Update Policy Rule" : "Create Policy Rule")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
