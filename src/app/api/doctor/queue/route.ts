import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    data: [
      { id: "Q-002", queueNo: "OPD-002", patientId: "PAT-2026-002", patientName: "Mr. Kamal Jayasuriya", age: 53, gender: "MALE", reason: "Chest pain follow-up", priority: "URGENT", status: "WAITING", waitingSince: "2026-09-15T07:00:00Z" },
      { id: "Q-004", queueNo: "OPD-004", patientId: "PAT-2026-004", patientName: "Mr. Nimal Silva", age: 65, gender: "MALE", reason: "Routine checkup", priority: "NORMAL", status: "WAITING", waitingSince: "2026-09-15T07:45:00Z" },
      { id: "Q-007", queueNo: "OPD-007", patientId: "PAT-2026-007", patientName: "Mrs. Chamari Wickrama", age: 42, gender: "FEMALE", reason: "Fever and cough", priority: "NORMAL", status: "WAITING", waitingSince: "2026-09-15T08:30:00Z" },
      { id: "Q-009", queueNo: "OPD-009", patientId: "PAT-2026-009", patientName: "Miss Harini Balasuriya", age: 28, gender: "FEMALE", reason: "Headache and dizziness", priority: "NORMAL", status: "WAITING", waitingSince: "2026-09-15T09:00:00Z" },
      { id: "Q-011", queueNo: "OPD-011", patientId: "PAT-2026-011", patientName: "Mr. Rohan Gunasekara", age: 38, gender: "MALE", reason: "Back pain", priority: "NORMAL", status: "COMPLETED", waitingSince: "2026-09-15T06:30:00Z" },
    ],
  });
}
