"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { token } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchPayroll = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/hr/payroll`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPayrolls(data.data || []);
    } catch (e) {
      toast.error("Failed to fetch payrolls");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [token]);

  const generatePayroll = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/hr/payroll/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ month: parseInt(selectedMonth), year: parseInt(selectedYear) })
      });
      if (res.ok) {
        toast.success(`Payroll generated for ${selectedMonth}/${selectedYear}`);
        fetchPayroll();
      } else {
        throw new Error("Failed to generate");
      }
    } catch (e) {
      toast.error("Error generating payroll");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Payroll Generation</h2>
          <p className="text-muted-foreground mt-1">Calculate and manage monthly salaries for all active staff.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v || "1")}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={m.toString()}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v || new Date().getFullYear().toString())}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generatePayroll} disabled={generating} className="bg-primary text-white">
            <Calculator className="w-4 h-4 mr-2" />
            {generating ? "Generating..." : "Generate Payroll"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" /> Generated Payslips</CardTitle>
          <CardDescription>All historical payslips are recorded here.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right text-primary font-bold">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(0, pr.month - 1).toLocaleString('default', { month: 'short' })} {pr.year}
                      </TableCell>
                      <TableCell>{pr.user?.fullName}</TableCell>
                      <TableCell>{pr.user?.Role?.name}</TableCell>
                      <TableCell className="text-right">LKR {pr.basicSalary?.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-500">- LKR {pr.deductions?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">LKR {pr.netSalary?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={pr.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                          {pr.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payrolls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No payslips generated yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
