"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banknote, Banknote, Receipt, CreditCard, Clock } from "lucide-react";
import Link from "next/link";

interface Metrics {
  pendingPayments: number;
  processedToday: number;
  totalRevenue: number;
  cashInDrawer: number;
  recentTransactions: { id: string; patientName: string; type: string; amount: number; status: string; time: string }[];
}

export default function CashierOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cashier/metrics").then(r => r.json()).then(d => { setMetrics(d); setLoading(false); });
  }, []);

  if (loading || !metrics) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Cashier Dashboard</h2>
        <p className="text-muted-foreground mt-2">Daily revenue summary and transaction monitoring.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">LKR {metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Processed today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.pendingPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting settlement</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Processed Txns</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.processedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Receipts generated</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash in Drawer</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {metrics.cashInDrawer.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Current cash balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Txns */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest payments and outstanding bills</CardDescription>
          </div>
          <Link href="/cashier/payments">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.recentTransactions.map((txn) => (
            <div key={txn.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                {txn.status === "COMPLETED" ? <Receipt className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#3A3435]">{txn.patientName}</p>
                  <span className="text-xs text-muted-foreground">· {txn.type}</span>
                  <Badge variant="secondary" className={txn.status === "PENDING" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ml-auto" : "bg-green-500/10 text-green-600 dark:text-green-400 ml-auto"}>
                    {txn.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground font-mono">{txn.id}</p>
                  <p className="font-semibold">LKR {txn.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
