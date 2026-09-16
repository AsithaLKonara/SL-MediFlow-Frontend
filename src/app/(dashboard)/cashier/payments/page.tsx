"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CreditCard, Banknote } from "lucide-react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface PaymentItem {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function CashierPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/cashier/payments").then(r => r.json()).then(d => { setPayments(d.data); setLoading(false); });
  }, []);

  const filtered = payments.filter(p => 
    p.patientName.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const pending = filtered.filter(p => p.status === "PENDING");
  const completed = filtered.filter(p => p.status === "COMPLETED");

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  const renderTable = (data: PaymentItem[], isPending: boolean) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Bill ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Type / Desc</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
             <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No records found.</TableCell></TableRow>
          ) : (
            data.map(p => (
              <TableRow key={p.id} className={!isPending ? "opacity-60" : ""}>
                <TableCell className="font-mono text-xs font-medium text-muted-foreground">{p.id}</TableCell>
                <TableCell>
                  <p className="font-medium text-[#3A3435]">{p.patientName}</p>
                  <p className="text-xs text-muted-foreground">{p.patientId}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="mb-1 text-[10px]">{p.type}</Badge>
                  <p className="text-sm">{p.description}</p>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleTimeString()}</TableCell>
                <TableCell className="text-right font-bold text-lg">LKR {p.amount.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  {isPending ? (
                    <Link href={`/cashier/process/${p.id}`}>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-2">
                        <CreditCard className="w-4 h-4" /> Pay Now
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/cashier/process/${p.id}`}>
                      <Button size="sm" variant="outline">View Receipt</Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Payments</h2>
          <p className="text-muted-foreground mt-1">Settle outstanding bills for consultations, pharmacy, and lab.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient or Bill ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-yellow-500">
        <CardHeader>
          <CardTitle>Pending Payments</CardTitle>
          <CardDescription>Click "Pay Now" to process transaction and issue receipt.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderTable(pending, true)}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Completed Today</CardTitle>
        </CardHeader>
        <CardContent>
          {renderTable(completed, false)}
        </CardContent>
      </Card>
    </div>
  );
}
