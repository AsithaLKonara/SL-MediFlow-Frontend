"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Clock, Plus, CheckCircle2, XCircle, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function OvertimeManagementPage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [otRates, setOtRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Create Modal State
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    date: new Date().toISOString().split("T")[0],
    shiftType: "NORMAL",
    startTime: "17:00",
    endTime: "21:00",
    rate: "",
    remarks: "",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchRecords = async () => {
    if (!token) return;
    try {
      let url = `${API}/hr/overtime`;
      if (statusFilter !== "ALL") url += `?status=${statusFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setRecords(data.data || []);
    } catch (e) {
      toast.error("Failed to load overtime records");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffAndRates = async () => {
    if (!token) return;
    try {
      const [staffRes, ratesRes] = await Promise.all([
        fetch(`${API}/admin/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/hr/overtime/rates`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const staffData = await staffRes.json();
      const ratesData = await ratesRes.json();
      if (staffRes.ok) setStaffList(staffData.data || staffData.users || []);
      if (ratesRes.ok) setOtRates(ratesData.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchStaffAndRates();
  }, [token, statusFilter]);

  const handleCreateOT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      // Build ISO DateTimes for start and end
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      const res = await fetch(`${API}/hr/overtime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: formData.userId,
          date: formData.date,
          shiftType: formData.shiftType,
          startTime: startDateTime,
          endTime: endDateTime,
          rate: formData.rate ? parseFloat(formData.rate) : undefined,
          remarks: formData.remarks,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Overtime record created successfully");
        setOpenCreateModal(false);
        fetchRecords();
      } else {
        toast.error(data.error || "Failed to create overtime record");
      }
    } catch (err: any) {
      toast.error(err.message || "Error submitting OT");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`${API}/hr/overtime/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Overtime ${status.toLowerCase()} successfully`);
        fetchRecords();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (e: any) {
      toast.error(e.message || "Error updating status");
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const name = r.user?.fullName?.toLowerCase() || "";
    const shift = r.shiftType?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || shift.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100 flex items-center gap-2">
            <Clock className="w-8 h-8 text-primary" /> Overtime (OT) Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Track, calculate, review, and approve staff overtime records. Only approved OT is included in monthly payroll.
          </p>
        </div>
        <Button onClick={() => setOpenCreateModal(true)} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Log Overtime
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search staff name or shift..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OT Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overtime Log</CardTitle>
          <CardDescription>
            Formula: Total OT Payment = Approved OT Hours × Applicable OT Rate per Hour (LKR)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift Type</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate / Hr</TableHead>
                  <TableHead className="text-right font-bold">Total (LKR)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{r.user?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{r.user?.Role?.name || "Staff"} · {r.user?.Department?.name || "General"}</div>
                    </TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.shiftType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.hours?.toFixed(1)} hrs</TableCell>
                    <TableCell className="text-right">LKR {r.rate?.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      LKR {r.totalPayment?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          r.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : r.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "PENDING" ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleStatusUpdate(r.id, "APPROVED")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleStatusUpdate(r.id, "REJECTED")}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.status === "APPROVED" ? `Approved by ${r.approvedBy?.fullName || "Admin"}` : "Rejected"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRecords.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No overtime records found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Overtime Dialog */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Overtime Record</DialogTitle>
            <DialogDescription>
              Record overtime hours for nurses or hospital staff.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOT} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Staff Member</label>
              <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v || "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName || s.name} ({s.Role?.name || s.role || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Shift Type</label>
                <Select value={formData.shiftType} onValueChange={(v) => setFormData({ ...formData, shiftType: v || "NORMAL" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal OT</SelectItem>
                    <SelectItem value="NIGHT">Night Shift OT</SelectItem>
                    <SelectItem value="WEEKEND">Weekend OT</SelectItem>
                    <SelectItem value="HOLIDAY">Holiday OT</SelectItem>
                    <SelectItem value="SPECIAL">Special Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Custom Rate / Hr (LKR, Optional)</label>
              <Input
                type="number"
                placeholder="Leave blank to use role default"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Remarks / Reason</label>
              <Input
                placeholder="e.g. ICU night coverage, emergency rush"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-white">
                {submitting ? "Saving..." : "Submit for Approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
