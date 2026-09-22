"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";

interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  status: string;
}

interface FinanceData {
  metrics: {
    todayRevenue: number;
    monthlyRevenue: number;
    outstandingReceivables: number;
    totalExpenses: number;
  };
  transactions: Transaction[];
  chartData: { month: string; income: number; expense: number }[];
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL}`}/finance/dashboard`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Financial Overview</h2>
        <p className="text-muted-foreground mt-1">Monitor revenue streams, expenses, and overall hospital financial health.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {data.metrics.todayRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1 font-medium">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +5% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {data.metrics.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Current month projection</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Receivables</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {data.metrics.outstandingReceivables.toLocaleString()}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Requires follow-up</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {data.metrics.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">For current month</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Income vs Expense</CardTitle>
          <CardDescription>A 6-month historical overview of hospital cash flow.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280'}}
                tickFormatter={(value) => `LKR ${value/1000}k`}
                dx={-10}
              />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`LKR ${Number(value).toLocaleString()}`, undefined]}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
              <Bar dataKey="income" name="Income" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={32} />
              <Bar dataKey="expense" name="Expense" fill="#C7C1BC" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial movements across all departments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.map((trx) => (
                <TableRow key={trx.id}>
                  <TableCell className="font-medium">{trx.id}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(trx.date).toLocaleString()}
                  </TableCell>
                  <TableCell>{trx.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={trx.type === 'INCOME' ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20" : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"}>
                      {trx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-[#3A3435]">LKR {trx.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={trx.status === 'COMPLETED' ? "bg-muted/50 text-foreground/80" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}
                    >
                      {trx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
