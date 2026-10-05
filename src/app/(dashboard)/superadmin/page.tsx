"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, DollarSign, Calendar, Activity, 
  TrendingUp, TrendingDown, AlertCircle, 
  Pill, ActivitySquare, ArrowUpRight
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { useAuth } from "@/components/providers/AuthProvider";

interface DashboardStats {
  summary: {
    totalPatients: number;
    newPatientsToday: number;
    totalAppointments: number;
    appointmentsYesterday: number;
    todaysRevenue: number;
    yesterdaysRevenue: number;
    pendingLabs: number;
    activeDoctorsCount: number;
    activeExtraServices: number;
  };
  charts: {
    revenueTrend: { date: string; revenue: number }[];
    departmentStats: { name: string; value: number }[];
  };
  tables: {
    inventoryAlerts: {
      id: string;
      name: string;
      category: string;
      currentStock: number;
      reorderLevel: number;
      unit: string;
    }[];
    recentTransactions: {
      id: string;
      amount: number;
      method: string;
      description: string;
      time: string;
    }[];
    doctorsAttendance: {
      name: string;
      specialty: string;
      status: string;
      arrivedAt: string | null;
    }[];
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard stats", err);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) return <div className="p-8">Failed to load data.</div>;

  const revGrowth = stats.summary.yesterdaysRevenue 
    ? ((stats.summary.todaysRevenue - stats.summary.yesterdaysRevenue) / stats.summary.yesterdaysRevenue) * 100 
    : 100;
    
  const apptGrowth = stats.summary.appointmentsYesterday 
    ? ((stats.summary.totalAppointments - stats.summary.appointmentsYesterday) / stats.summary.appointmentsYesterday) * 100 
    : 100;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of hospital operations.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-card p-2 rounded-lg border shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium">Live Updates Active</span>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Today's Revenue</h3>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            LKR {stats.summary.todaysRevenue.toLocaleString()}
          </p>
          <div className="flex items-center mt-4 text-sm">
            {revGrowth >= 0 ? (
              <TrendingUp size={16} className="text-emerald-500 mr-1" />
            ) : (
              <TrendingDown size={16} className="text-rose-500 mr-1" />
            )}
            <span className={revGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}>
              {Math.abs(revGrowth).toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-2">vs yesterday</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Patients</h3>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.summary.totalPatients.toLocaleString()}</p>
          <div className="flex items-center mt-4 text-sm">
            <ArrowUpRight size={16} className="text-blue-500 mr-1" />
            <span className="text-blue-500">+{stats.summary.newPatientsToday}</span>
            <span className="text-muted-foreground ml-2">new today</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Appointments Today</h3>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <Calendar size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.summary.totalAppointments}</p>
          <div className="flex items-center mt-4 text-sm">
            {apptGrowth >= 0 ? (
              <TrendingUp size={16} className="text-purple-500 mr-1" />
            ) : (
              <TrendingDown size={16} className="text-rose-500 mr-1" />
            )}
            <span className={apptGrowth >= 0 ? "text-purple-500" : "text-rose-500"}>
              {Math.abs(apptGrowth).toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-2">vs yesterday</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Operations Overview</h3>
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
              <Activity size={20} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.summary.pendingLabs}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Labs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.summary.activeDoctorsCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Doctors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.summary.activeExtraServices}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Services</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} 
          className="lg:col-span-2 bg-card border shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Revenue Trend (Last 7 Days)</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.charts.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
          className="bg-card border shadow-sm rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-foreground mb-6">Appointments by Department</h2>
          <div className="flex-1 min-h-[300px]">
            {stats.charts.departmentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.charts.departmentStats}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.charts.departmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No appointments today</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {stats.charts.departmentStats.map((entry, idx) => (
              <div key={idx} className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="truncate" title={entry.name}>{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* TABLES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Alerts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="bg-card border shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border bg-muted/30 flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center">
              <AlertCircle size={18} className="mr-2 text-rose-500" /> 
              Low Stock Alerts
            </h2>
            <span className="bg-rose-500/10 text-rose-500 text-xs font-semibold px-2 py-1 rounded-full">
              {stats.tables.inventoryAlerts.length} Items
            </span>
          </div>
          <div className="p-0 overflow-auto flex-1 max-h-[400px]">
            {stats.tables.inventoryAlerts.length > 0 ? (
              <ul className="divide-y divide-border">
                {stats.tables.inventoryAlerts.map(item => (
                  <li key={item.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-500">{item.currentStock} {item.unit}</p>
                      <p className="text-xs text-muted-foreground">Min: {item.reorderLevel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">Stock levels are optimal</div>
            )}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="bg-card border shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold flex items-center">
              <ActivitySquare size={18} className="mr-2 text-blue-500" /> 
              Recent Transactions
            </h2>
          </div>
          <div className="p-0 overflow-auto flex-1 max-h-[400px]">
            {stats.tables.recentTransactions.length > 0 ? (
              <ul className="divide-y divide-border">
                {stats.tables.recentTransactions.map(tx => (
                  <li key={tx.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm text-foreground truncate max-w-[150px]">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.time).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-500">+LKR {tx.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{tx.method}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
            )}
          </div>
        </motion.div>

        {/* Active Doctors */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}
          className="bg-card border shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold flex items-center">
              <Pill size={18} className="mr-2 text-purple-500" /> 
              Today's Attendance
            </h2>
          </div>
          <div className="p-0 overflow-auto flex-1 max-h-[400px]">
            {stats.tables.doctorsAttendance.length > 0 ? (
              <ul className="divide-y divide-border">
                {stats.tables.doctorsAttendance.map((doc, idx) => (
                  <li key={idx} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="relative mr-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {doc.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${
                          doc.status === 'ARRIVED' || doc.status === 'IN_CONSULTATION' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-semibold ${
                        doc.status === 'ARRIVED' ? 'bg-emerald-500/10 text-emerald-500' : 
                        doc.status === 'IN_CONSULTATION' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {doc.status}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {doc.arrivedAt ? new Date(doc.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No doctors marked attendance today</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
