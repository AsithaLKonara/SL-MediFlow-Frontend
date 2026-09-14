import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    metrics: {
      todayRevenue: 45000,
      monthlyRevenue: 1250000,
      outstandingReceivables: 120000,
      totalExpenses: 850000
    },
    transactions: [
      { id: "TRX-001", date: "2026-09-15T10:30:00Z", type: "INCOME", category: "OPD", amount: 1500, status: "COMPLETED" },
      { id: "TRX-002", date: "2026-09-15T11:15:00Z", type: "INCOME", category: "PHARMACY", amount: 450, status: "COMPLETED" },
      { id: "TRX-003", date: "2026-09-14T15:45:00Z", type: "EXPENSE", category: "SALARY", amount: 12000, status: "PENDING" },
      { id: "TRX-004", date: "2026-09-14T09:20:00Z", type: "INCOME", category: "LAB", amount: 800, status: "COMPLETED" },
      { id: "TRX-005", date: "2026-09-13T14:10:00Z", type: "EXPENSE", category: "SUPPLIES", amount: 3500, status: "COMPLETED" },
    ],
    chartData: [
      { month: "Jan", income: 400000, expense: 250000 },
      { month: "Feb", income: 300000, expense: 280000 },
      { month: "Mar", income: 500000, expense: 300000 },
      { month: "Apr", income: 450000, expense: 270000 },
      { month: "May", income: 600000, expense: 350000 },
      { month: "Jun", income: 700000, expense: 400000 }
    ]
  });
}
