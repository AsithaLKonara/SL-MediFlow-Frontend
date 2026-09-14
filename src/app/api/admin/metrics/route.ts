import { NextResponse } from "next/server";

export async function GET() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    totalRevenue: 1250000.00,
    revenueGrowth: 12.5,
    activeStaff: 142,
    patientVisitsToday: 350,
    departmentsPerformance: [
      { name: "OPD", score: 92 },
      { name: "Pharmacy", score: 88 },
      { name: "Laboratory", score: 95 },
      { name: "Emergency", score: 85 },
      { name: "Radiology", score: 90 },
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
