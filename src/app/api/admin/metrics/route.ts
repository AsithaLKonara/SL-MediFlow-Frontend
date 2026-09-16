import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    totalStaff: 142,
    revenue: 1250000.00,
    activeDoctors: 24,
    activePatients: 350,
    revenueGrowth: 12.5,
    systemAlerts: [
      { id: 1, type: "CRITICAL", title: "Low Pharmacy Stock", message: "Paracetamol 500mg falls below 100 units.", time: "10 mins ago" },
      { id: 2, type: "WARNING", title: "High Wait Times", message: "OPD wait times exceed 45 minutes for Dr. Silva.", time: "1 hour ago" },
      { id: 3, type: "INFO", title: "System Update", message: "Database backup completed successfully.", time: "3 hours ago" },
      { id: 4, type: "INFO", title: "New Staff Added", message: "Dr. Jenkins (Cardiology) profile created.", time: "5 hours ago" },
    ],
    revenueData: [
      { name: 'Jan', revenue: 400000 },
      { name: 'Feb', revenue: 300000 },
      { name: 'Mar', revenue: 500000 },
      { name: 'Apr', revenue: 450000 },
      { name: 'May', revenue: 600000 },
      { name: 'Jun', revenue: 700000 },
    ]
  });
}
