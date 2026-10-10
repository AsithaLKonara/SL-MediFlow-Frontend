"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CalendarCheck, CheckCircle2, User, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MyHRPortal() {
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  
  const [formData, setFormData] = useState({
    type: "SICK",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  const clockIn = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API}/hr/attendance/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        toast.success("Clocked in successfully");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to clock in");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const clockOut = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API}/hr/attendance/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        toast.success("Clocked out successfully");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to clock out");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;
    try {
      const res = await fetch(`${API}/hr/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, userId: user.id })
      });
      if (res.ok) {
        toast.success("Leave request submitted");
        setFormData({ type: "SICK", startDate: "", endDate: "", reason: "" });
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit leave");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">My HR Portal</h2>
        <p className="text-muted-foreground mt-1">Manage your attendance and leave requests.</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-primary" /> Apply for Leave</CardTitle>
            <CardDescription>Submit a new leave request to HR.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitLeave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Leave Type</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v || "SICK"})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SICK">Sick Leave</SelectItem>
                    <SelectItem value="CASUAL">Casual Leave</SelectItem>
                    <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                    <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" required value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" required value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea required placeholder="Please provide a reason..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
