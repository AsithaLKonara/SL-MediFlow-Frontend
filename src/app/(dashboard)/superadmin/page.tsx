"use client";

import { useEffect, useState } from "react";

interface DashboardStats {
  totalAppointments: number;
  doctorsAttendance: { name: string, status: string, arrivedAt: string | null }[];
  pendingLabs: number;
  todaysRevenue: number;
}

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/admin/dashboard`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard stats", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Hospital Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Today's Appointments</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalAppointments || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Labs</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.pendingLabs || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Today's Revenue</h3>
          <p className="text-3xl font-bold text-emerald-600">
            LKR {stats?.todaysRevenue?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">Doctor Attendance Status</h2>
        </div>
        <div className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-sm font-medium text-gray-500">
                <th className="p-4 font-medium">Doctor Name</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Arrival Time</th>
              </tr>
            </thead>
            <tbody>
              {stats?.doctorsAttendance?.length ? (
                stats.doctorsAttendance.map((doc, idx) => (
                  <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{doc.name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'ARRIVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {doc.arrivedAt ? new Date(doc.arrivedAt).toLocaleTimeString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-sm text-gray-500">
                    No attendance records for today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
