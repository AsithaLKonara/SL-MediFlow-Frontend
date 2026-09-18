import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    pendingPrescriptions: 8,
    fulfilledToday: 34,
    lowStockItems: 5,
    totalRevenue: 12500,
    recentPrescriptions: [
      { id: "RX-2026-001", patientName: "Mr. Kamal Jayasuriya", doctor: "Dr. Sarah Jenkins", drugs: ["Amlodipine 5mg", "Metformin 500mg"], status: "PENDING", issuedAt: "2026-09-15T07:30:00Z" },
      { id: "RX-2026-002", patientName: "Mrs. Kumari Dias", doctor: "Dr. Sarah Jenkins", drugs: ["Paracetamol 500mg"], status: "PENDING", issuedAt: "2026-09-15T08:00:00Z" },
      { id: "RX-2026-003", patientName: "Mr. Nimal Silva", doctor: "Dr. Robert Chen", drugs: ["Nitroglycerine SL", "Aspirin 75mg"], status: "FULFILLED", issuedAt: "2026-09-15T06:15:00Z" },
    ],
  });
}
