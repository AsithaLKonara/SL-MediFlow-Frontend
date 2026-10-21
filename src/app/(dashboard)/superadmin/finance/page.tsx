  "use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Banknote, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp,
  Plus, Loader2, LayoutDashboard, Clock, ArrowLeftRight, Receipt,
  ChevronLeft, ChevronRight, Search, X, Filter
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Table, TableCell, TableHead, TableHeader, TableRow, TableBody
} from "@/components/ui/table";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string; fullId?: string; date: string; type: string;
  category: string; amount: number; status: string; description?: string;
}

interface FinanceData {
  metrics: {
    todayRevenue: number; monthlyRevenue: number;
    outstandingReceivables: number; totalExpenses: number;
  };
  transactions: Transaction[];
  chartData: { month: string; income: number; expense: number }[];
}

interface Expense {
  id: string; category: string; amount: number;
  description: string; status: string; date: string;
}

interface Shift {
  id: string; cashier: string; openedAt: string; closedAt: string | null;
  startingFloat: number; cashTotal?: number; cardTotal?: number; totalSales?: number;
  cashRefunds?: number; expectedCash: number; actualCash: number | null;
  variance: number | null; status: string;
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

// ─── Pagination Controls ──────────────────────────────────────────────────────

function PaginationBar({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (p: number) => void }) {
  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  if (total === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span> records
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p: number;
          if (totalPages <= 7) { p = i + 1; }
          else if (page <= 4) { p = i + 1; }
          else if (page >= totalPages - 3) { p = totalPages - 6 + i; }
          else { p = page - 3 + i; }
          return (
            <Button
              key={p} variant={p === page ? "default" : "outline"}
              size="icon" className="h-8 w-8 text-xs"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          );
        })}
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterConfig {
  searchQuery: string; onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  selects?: { key: string; label: string; value: string | null; options: { value: string; label: string }[] }[];
  onSelectChange?: (key: string, value: string) => void;
  dateFrom?: string; onDateFromChange?: (v: string) => void;
  dateTo?: string; onDateToChange?: (v: string) => void;
  onClear: () => void;
}

function FilterBar({ searchQuery, onSearchChange, searchPlaceholder, selects, onSelectChange, dateFrom, onDateFromChange, dateTo, onDateToChange, onClear }: FilterConfig) {
  const hasActive = searchQuery.length > 0 || (selects || []).some(s => s.value && s.value !== "ALL") || !!dateFrom || !!dateTo;
  return (
    <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-xl px-4 py-3 mb-4 shadow-sm">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => onSearchChange(e.target.value)} placeholder={searchPlaceholder || "Search..."} className="pl-9 bg-muted/40" />
      </div>
      {selects?.map(s => (
        <Select key={s.key} value={s.value || ""} onValueChange={(v: any) => onSelectChange?.(s.key, v)}>
          <SelectTrigger className="w-[150px] bg-muted/40">
            <SelectValue placeholder={s.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All {s.label}</SelectItem>
            {s.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ))}
      {onDateFromChange && (
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom || ""} onChange={e => onDateFromChange(e.target.value)} className="w-[150px] bg-muted/40 text-sm" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={dateTo || ""} onChange={e => onDateToChange?.(e.target.value)} className="w-[150px] bg-muted/40 text-sm" />
        </div>
      )}
      {hasActive && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground gap-1.5">
          <X className="w-3.5 h-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}

// ─── Status / Type Badges ─────────────────────────────────────────────────────

function TxTypeBadge({ type }: { type: string }) {
  return type === 'INCOME'
    ? <Badge variant="outline" className="text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20">INCOME</Badge>
    : <Badge variant="outline" className="text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20">EXPENSE</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'COMPLETED' || status === 'CLOSED'
    ? "bg-muted/50 text-foreground/80"
    : status === 'PENDING'
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : status === 'REFUNDED'
        ? "bg-blue-500/10 text-blue-600"
        : "bg-muted/50";
  return <Badge variant="secondary" className={cls}>{status}</Badge>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { token } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;

  // Overview
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactions tab
  const [txData, setTxData] = useState<Transaction[]>([]);
  const [txPagination, setTxPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txType, setTxType] = useState("ALL");
  const [txCategory, setTxCategory] = useState("ALL");
  const [txStatus, setTxStatus] = useState("ALL");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [txPage, setTxPage] = useState(1);

  // Expenses tab
  const [expData, setExpData] = useState<Expense[]>([]);
  const [expPagination, setExpPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [expLoading, setExpLoading] = useState(false);
  const [expSearch, setExpSearch] = useState("");
  const [expCategory, setExpCategory] = useState("ALL");
  const [expStatus, setExpStatus] = useState("ALL");
  const [expDateFrom, setExpDateFrom] = useState("");
  const [expDateTo, setExpDateTo] = useState("");
  const [expPage, setExpPage] = useState(1);

  // Shifts tab
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftPagination, setShiftPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftPage, setShiftPage] = useState(1);

  // Expense dialog
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: "", description: "", date: new Date().toISOString().split('T')[0] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetchers ────────────────────────────────────────────────

  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/finance/dashboard`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      const json = await res.json();
      setData(json.success && json.data ? json.data : json.metrics ? json : null);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [token, API]);

  const buildQuery = (params: Record<string, string | number | undefined>) =>
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== "ALL").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");

  const fetchTransactions = useCallback(async (page: number) => {
    if (!token) return;
    setTxLoading(true);
    try {
      const q = buildQuery({ page, limit: 50, search: txSearch || undefined, type: txType !== "ALL" ? txType : undefined, category: txCategory !== "ALL" ? txCategory : undefined, status: txStatus !== "ALL" ? txStatus : undefined, startDate: txDateFrom || undefined, endDate: txDateTo || undefined });
      const res = await fetch(`${API}/finance/transactions?${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const json = await res.json();
      if (json.success) { setTxData(json.data || []); setTxPagination(json.pagination); }
    } catch (err) { console.error(err); }
    finally { setTxLoading(false); }
  }, [token, API, txSearch, txType, txCategory, txStatus, txDateFrom, txDateTo]);

  const fetchExpenses = useCallback(async (page: number) => {
    if (!token) return;
    setExpLoading(true);
    try {
      const q = buildQuery({ page, limit: 50, search: expSearch || undefined, category: expCategory !== "ALL" ? expCategory : undefined, status: expStatus !== "ALL" ? expStatus : undefined, startDate: expDateFrom || undefined, endDate: expDateTo || undefined });
      const res = await fetch(`${API}/finance/expenses?${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const json = await res.json();
      if (json.success) { setExpData(json.data || []); setExpPagination(json.pagination); }
    } catch (err) { console.error(err); }
    finally { setExpLoading(false); }
  }, [token, API, expSearch, expCategory, expStatus, expDateFrom, expDateTo]);

  const fetchShifts = useCallback(async (page: number) => {
    if (!token) return;
    setShiftsLoading(true);
    try {
      const res = await fetch(`${API}/finance/shifts?page=${page}&limit=50`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const json = await res.json();
      if (json.success) { setShifts(json.data || []); setShiftPagination(json.pagination); }
    } catch (err) { console.error(err); }
    finally { setShiftsLoading(false); }
  }, [token, API]);

  // Initial load
  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { setTxPage(1); fetchTransactions(1); }, [txSearch, txType, txCategory, txStatus, txDateFrom, txDateTo]);
  useEffect(() => { fetchTransactions(txPage); }, [txPage]);
  useEffect(() => { setExpPage(1); fetchExpenses(1); }, [expSearch, expCategory, expStatus, expDateFrom, expDateTo]);
  useEffect(() => { fetchExpenses(expPage); }, [expPage]);
  useEffect(() => { fetchShifts(shiftPage); }, [shiftPage]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.category || !expenseForm.amount || !expenseForm.description) {
      toast.error("Please fill in all required fields"); return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API}/finance/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: expenseForm.category, amount: Number(expenseForm.amount), description: expenseForm.description, date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString() })
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      toast.success("Expense added successfully");
      setIsAddExpenseOpen(false);
      setExpenseForm({ category: "", amount: "", description: "", date: new Date().toISOString().split('T')[0] });
      fetchOverview();
      fetchExpenses(1);
    } catch (err: any) { toast.error(err.message || "Failed to add expense"); }
    finally { setIsSubmitting(false); }
  };

  // ── Render ──────────────────────────────────────────────────

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  if (error || !data) return (
    <div className="flex h-[80vh] items-center justify-center flex-col text-red-500">
      <p className="text-xl font-semibold mb-2">Error Loading Finance Data</p>
      <p>{error || "Unknown error occurred."}</p>
    </div>
  );

  const TAB_TRIGGER = "px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Financial Overview</h2>
          <p className="text-muted-foreground mt-1">Monitor revenue streams, expenses, and overall hospital financial health.</p>
        </div>
        <Button onClick={() => setIsAddExpenseOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1.5 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="overview" className={TAB_TRIGGER}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className={TAB_TRIGGER}>
            <ArrowLeftRight className="w-4 h-4 mr-2" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="expenses" className={TAB_TRIGGER}>
            <Receipt className="w-4 h-4 mr-2" /> Expense Register
          </TabsTrigger>
          <TabsTrigger value="shifts" className={TAB_TRIGGER}>
            <Clock className="w-4 h-4 mr-2" /> Shift Records
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
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
                  <ArrowUpRight className="w-3 h-3 mr-1" /> +5% from yesterday
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
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(v) => `LKR ${v / 1000}k`} dx={-10} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--card-foreground)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, undefined]} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="expense" name="Expense" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Transactions Preview */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest financial movements. Go to the Transactions tab for full list with filters.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>ID</TableHead>
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
                      <TableCell className="text-muted-foreground">{new Date(trx.date).toLocaleString()}</TableCell>
                      <TableCell>{trx.category}</TableCell>
                      <TableCell><TxTypeBadge type={trx.type} /></TableCell>
                      <TableCell className="text-right font-bold text-[#3A3435] dark:text-gray-100">LKR {trx.amount.toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={trx.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TRANSACTIONS TAB ──────────────────────────────── */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight">All Transactions</h3>
              <p className="text-muted-foreground text-sm mt-0.5">Unified ledger of all income and expense movements.</p>
            </div>
          </div>

          <FilterBar
            searchQuery={txSearch}
            onSearchChange={setTxSearch}
            searchPlaceholder="Search by category or ID..."
            selects={[
              { key: "type", label: "Type", value: txType, options: [{ value: "INCOME", label: "Income" }, { value: "EXPENSE", label: "Expense" }] },
              { key: "status", label: "Status", value: txStatus, options: [{ value: "COMPLETED", label: "Completed" }, { value: "PENDING", label: "Pending" }, { value: "REFUNDED", label: "Refunded" }] },
            ]}
            onSelectChange={(key, val) => {
              if (key === "type") setTxType(val);
              if (key === "status") setTxStatus(val);
            }}
            dateFrom={txDateFrom}
            onDateFromChange={setTxDateFrom}
            dateTo={txDateTo}
            onDateToChange={setTxDateTo}
            onClear={() => { setTxSearch(""); setTxType("ALL"); setTxCategory("ALL"); setTxStatus("ALL"); setTxDateFrom(""); setTxDateTo(""); }}
          />

          <Card className="shadow-sm">
            <CardContent className="p-0">
              {txLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/30">
                        <TableHead className="pl-6">ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (LKR)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txData.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions match your filters.</TableCell></TableRow>
                      ) : txData.map((trx, i) => (
                        <TableRow key={trx.fullId || i}>
                          <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{trx.id}</TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{new Date(trx.date).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{trx.category}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{trx.description || "—"}</TableCell>
                          <TableCell><TxTypeBadge type={trx.type} /></TableCell>
                          <TableCell className={`text-right font-bold ${trx.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trx.type === 'INCOME' ? '+' : '-'}{trx.amount.toLocaleString()}
                          </TableCell>
                          <TableCell><StatusBadge status={trx.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!txLoading && txPagination.total > 0 && (
                <div className="px-6 pb-4">
                  <PaginationBar pagination={txPagination} onPageChange={setTxPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EXPENSES TAB ──────────────────────────────────── */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Expense Register</h3>
              <p className="text-muted-foreground text-sm mt-0.5">Detailed log of all recorded hospital expenses.</p>
            </div>
            <Button onClick={() => setIsAddExpenseOpen(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Add Expense
            </Button>
          </div>

          <FilterBar
            searchQuery={expSearch}
            onSearchChange={setExpSearch}
            searchPlaceholder="Search by description..."
            selects={[
              {
                key: "category", label: "Category", value: expCategory,
                options: ["Medical Supplies", "Salaries", "Utilities", "Maintenance", "Marketing", "Other"].map(c => ({ value: c, label: c }))
              },
              { key: "status", label: "Status", value: expStatus, options: [{ value: "COMPLETED", label: "Completed" }, { value: "PENDING", label: "Pending" }] },
            ]}
            onSelectChange={(key, val) => {
              if (key === "category") setExpCategory(val);
              if (key === "status") setExpStatus(val);
            }}
            dateFrom={expDateFrom}
            onDateFromChange={setExpDateFrom}
            dateTo={expDateTo}
            onDateToChange={setExpDateTo}
            onClear={() => { setExpSearch(""); setExpCategory("ALL"); setExpStatus("ALL"); setExpDateFrom(""); setExpDateTo(""); }}
          />

          <Card className="shadow-sm">
            <CardContent className="p-0">
              {expLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/30">
                        <TableHead className="pl-6">Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount (LKR)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expData.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No expenses match your filters.</TableCell></TableRow>
                      ) : expData.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell className="pl-6 text-muted-foreground whitespace-nowrap text-sm">{new Date(exp.date).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{exp.category}</Badge></TableCell>
                          <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground" title={exp.description}>{exp.description}</TableCell>
                          <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                            {exp.amount.toLocaleString()}
                          </TableCell>
                          <TableCell><StatusBadge status={exp.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!expLoading && expPagination.total > 0 && (
                <div className="px-6 pb-4">
                  <PaginationBar pagination={expPagination} onPageChange={setExpPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SHIFTS TAB ─────────────────────────────────────── */}
        <TabsContent value="shifts" className="space-y-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight">POS Shift Records</h3>
            <p className="text-muted-foreground text-sm mt-0.5">Historical record of all frontdesk shift closures and variances.</p>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {shiftsLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/30 text-xs">
                        <TableHead className="pl-6">Cashier</TableHead>
                        <TableHead>Time Window</TableHead>
                        <TableHead className="text-right">Starting Float</TableHead>
                        <TableHead className="text-right">Cash Sales</TableHead>
                        <TableHead className="text-right">Card / Digital</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Expected in Drawer</TableHead>
                        <TableHead className="text-right">Declared Cash</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="pr-6 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No shifts recorded yet.</TableCell></TableRow>
                      ) : shifts.map((s) => {
                        const cashSales = s.cashTotal ?? 0;
                        const cardSales = s.cardTotal ?? 0;
                        const totalSales = s.totalSales ?? (cashSales + cardSales);
                        const isClosed = s.status === "CLOSED";

                        return (
                          <TableRow key={s.id} className="text-sm hover:bg-muted/20">
                            <TableCell className="pl-6 font-semibold">{s.cashier}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              <div>{new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(s.openedAt).toLocaleDateString()})</div>
                              <div className="text-[11px] opacity-75">{s.closedAt ? `Closed: ${new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Currently Open"}</div>
                            </TableCell>
                            <TableCell className="text-right font-medium">LKR {s.startingFloat.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">LKR {cashSales.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">LKR {cardSales.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-bold text-foreground">LKR {totalSales.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">
                              LKR {s.expectedCash.toLocaleString()}
                              <span className="block text-[10px] text-muted-foreground font-normal">(Float + Cash)</span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {s.actualCash !== null ? `LKR ${s.actualCash.toLocaleString()}` : <span className="text-muted-foreground italic text-xs">Active Shift</span>}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {s.variance !== null ? (
                                <span className={s.variance < 0 ? "text-red-500 font-semibold" : s.variance > 0 ? "text-green-500 font-semibold" : "text-muted-foreground"}>
                                  {s.variance > 0 ? `+LKR ${s.variance.toLocaleString()}` : `LKR ${s.variance.toLocaleString()}`}
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="pr-6 text-center"><StatusBadge status={s.status} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!shiftsLoading && shiftPagination.total > 0 && (
                <div className="px-6 pb-4">
                  <PaginationBar pagination={shiftPagination} onPageChange={setShiftPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Add New Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={expenseForm.category} onValueChange={(val) => setExpenseForm(p => ({ ...p, category: val || "" }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {["Medical Supplies", "Salaries", "Utilities", "Maintenance", "Marketing", "Other"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (LKR) *</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 15000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" placeholder="Details about the expense..." value={expenseForm.description} onChange={(e) => setExpenseForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Expense"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
