"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { PayslipPrintTemplate } from "../components/PayslipPrintTemplate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Banknote, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export default function PayrollRunDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { token } = useAuth();
  
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [printRecords, setPrintRecords] = useState<any[]>([]);

  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Payslips",
    onAfterPrint: () => setPrintRecords([]),
  });

  const triggerPrint = (records: any[]) => {
    setPrintRecords(records);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (token) fetchRunDetails();
  }, [token]);

  const fetchRunDetails = async () => {
    try {
      const res = await fetch(`${API}/hr/payroll/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRun(data.data);
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Failed to fetch payroll run details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!run) return <div className="p-8 text-center text-red-500">Run not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Payroll Run Details</h2>
          <p className="text-muted-foreground mt-1">
            {new Date(run.periodStart).toLocaleDateString()} to {new Date(run.periodEnd).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => triggerPrint(run.records || [])}>
            <Printer className="w-4 h-4" /> Print All Payslips
          </Button>
          <Badge className={run.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
            {run.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" /> Employee Payslips</CardTitle>
          <CardDescription>Individual payslips generated during this run.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-right">Total Earnings</TableHead>
                  <TableHead className="text-right">Total Deductions</TableHead>
                  <TableHead className="text-right">Employer Cost</TableHead>
                  <TableHead className="text-right text-primary font-bold">Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.records?.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.user?.fullName || "Unknown Employee"}</TableCell>
                    <TableCell className="text-right">LKR {record.totalEarnings?.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-500">- LKR {record.totalDeductions?.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">LKR {record.employerCost?.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">LKR {record.netSalary?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => triggerPrint([record])}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                          View Line Items
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!run.records || run.records.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No records found for this run.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Payslip Line Items</DialogTitle>
            <DialogDescription>
              {selectedRecord?.user?.fullName}'s detailed calculation breakdown.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedRecord?.lineItems?.map((li: any) => (
                  <TableRow key={li.id}>
                    <TableCell><Badge variant="outline">{li.category}</Badge></TableCell>
                    <TableCell>{li.description}</TableCell>
                    <TableCell className={`text-right ${li.category === 'DEDUCTION' ? 'text-red-500' : (li.category === 'EMPLOYER_CONTRIBUTION' ? 'text-muted-foreground' : 'text-green-600')}`}>
                      {li.category === 'DEDUCTION' ? '-' : ''} LKR {li.amount?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end gap-6 mt-6 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="font-bold">LKR {selectedRecord?.totalEarnings?.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="font-bold text-red-500">- LKR {selectedRecord?.totalDeductions?.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Net Salary</p>
                <p className="font-bold text-primary text-lg">LKR {selectedRecord?.netSalary?.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="hidden">
        <PayslipPrintTemplate 
          ref={componentRef} 
          records={printRecords} 
          runPeriod={`${new Date(run.periodStart).toLocaleDateString()} to ${new Date(run.periodEnd).toLocaleDateString()}`} 
        />
      </div>
    </div>
  );
}
