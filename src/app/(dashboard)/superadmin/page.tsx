"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Activity, Stethoscope, TrendingUp, Bell, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemAlert {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
}

interface Metrics {
  totalStaff: number;
  revenue: number;
  activeDoctors: number;
  activePatients: number;
  revenueGrowth: number;
  systemAlerts: SystemAlert[];
  revenueData: { name: string, revenue: number }[];
}

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/metrics").then(res => res.json()).then(d => {
      setMetrics(d);
      setLoading(false);
    });
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "CRITICAL": return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "WARNING": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Super Admin Dashboard</h2>
        <p className="text-muted-foreground mt-2">Welcome back. Here is your system-wide overview.</p>
      </div>

      {/* KPI Row: Total Staff, Revenue, Active Doctors, Active Patients */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStaff}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered across all roles
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">${metrics.revenue.toLocaleString()}</div>
            <p className="text-xs flex items-center mt-1 text-green-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{metrics.revenueGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeDoctors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently on shift today
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activePatients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In queues or consultations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Area: Revenue Chart (Left), System Alerts/Recent Activity (Right) */}
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-t-2 border-t-slate-200">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue breakdown for the current year</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280'}}
                  tickFormatter={(value) => `$${value/1000}k`}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6B0F26" strokeWidth={3} dot={{r: 4, fill: '#6B0F26', strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>System Alerts & Activity</CardTitle>
            </div>
            <CardDescription>Recent system events and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.systemAlerts.map((alert) => (
                <div key={alert.id} className="flex gap-4 items-start p-3 rounded-lg border bg-muted/30/50 hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold leading-none">{alert.title}</p>
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
