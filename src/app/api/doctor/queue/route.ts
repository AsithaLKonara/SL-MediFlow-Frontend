import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    data: [
      { id: "Q-021", queueNo: "D021", patientId: "AMZ-P-000006", patientName: "Kamal Perera", age: 45, gender: "MALE", reason: "General Consultation", priority: "NORMAL", status: "WAITING", waitingSince: new Date().toISOString() },
      { id: "Q-002", queueNo: "D019", patientId: "PAT-2026-002", patientName: "Patient A", age: 53, gender: "MALE", reason: "Chest pain follow-up", priority: "NORMAL", status: "COMPLETED", waitingSince: "2026-09-15T07:00:00Z" },
      { id: "Q-004", queueNo: "D020", patientId: "PAT-2026-004", patientName: "Patient B", age: 65, gender: "MALE", reason: "Routine checkup", priority: "NORMAL", status: "COMPLETED", waitingSince: "2026-09-15T07:45:00Z" },
      { id: "Q-007", queueNo: "D022", patientId: "PAT-2026-007", patientName: "Nimal", age: 42, gender: "MALE", reason: "Fever and cough", priority: "NORMAL", status: "WAITING", waitingSince: "2026-09-15T08:30:00Z" },
    ],
  });
}
