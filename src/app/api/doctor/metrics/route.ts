import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    doctorName: "Dr. Sarah Jenkins",
    specialty: "General Medicine",
    patientsToday: 12,
    completedConsultations: 7,
    pendingQueue: 5,
    pendingPrescriptions: 3,
    pendingLabRequests: 2,
    upcomingPatients: [
      { queueNo: "OPD-002", patientId: "PAT-2026-002", patientName: "Mr. Kamal Jayasuriya", age: 53, reason: "Chest pain follow-up", status: "WAITING" },
      { queueNo: "OPD-004", patientId: "PAT-2026-004", patientName: "Mr. Nimal Silva", age: 65, reason: "Routine checkup", status: "WAITING" },
      { queueNo: "OPD-007", patientId: "PAT-2026-007", patientName: "Mrs. Chamari Wickrama", age: 42, reason: "Fever and cough", status: "WAITING" },
    ],
  });
}
