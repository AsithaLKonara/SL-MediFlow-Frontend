import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    pendingPayments: 14,
    processedToday: 58,
    totalRevenue: 24500,
    cashInDrawer: 3200,
    recentTransactions: [
      { id: "TXN-2026-089", patientName: "Mr. Kamal Jayasuriya", type: "Pharmacy Bill", amount: 154.50, status: "COMPLETED", time: "2026-09-15T09:15:00Z" },
      { id: "TXN-2026-090", patientName: "Mrs. Kumari Dias", type: "Consultation", amount: 50.00, status: "PENDING", time: "2026-09-15T09:20:00Z" },
      { id: "TXN-2026-091", patientName: "Miss Dilini Fernando", type: "Lab Tests", amount: 120.00, status: "COMPLETED", time: "2026-09-15T09:25:00Z" },
    ],
  });
}
