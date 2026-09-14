import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    pendingRequests: 6,
    inProgressTests: 3,
    publishedToday: 12,
    criticalResults: 1,
    urgentRequests: [
      { id: "LAB-2026-003", patientName: "Miss Dilini Fernando", doctor: "Dr. Priya Ramanathan", tests: ["Full Blood Count", "Urine Full Report"], priority: "URGENT", requestedAt: "2026-09-15T07:20:00Z" },
    ],
  });
}
