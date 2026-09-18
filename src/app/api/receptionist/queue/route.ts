import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return NextResponse.json({
    data: [
      { id: "Q-001", queueNo: "OPD-001", patientId: "PAT-2026-001", patientName: "Mrs. Amara Perera", assignedDoctor: "Dr. Sarah Jenkins", registeredAt: "2026-09-15T06:15:00Z", status: "IN_CONSULTATION", priority: "NORMAL" },
      { id: "Q-002", queueNo: "OPD-002", patientId: "PAT-2026-002", patientName: "Mr. Kamal Jayasuriya", assignedDoctor: "Dr. Robert Chen", registeredAt: "2026-09-15T07:00:00Z", status: "WAITING", priority: "NORMAL" },
      { id: "Q-003", queueNo: "OPD-003", patientId: "PAT-2026-003", patientName: "Miss Dilini Fernando", assignedDoctor: null, registeredAt: "2026-09-15T07:20:00Z", status: "WAITING", priority: "URGENT" },
      { id: "Q-004", queueNo: "OPD-004", patientId: "PAT-2026-004", patientName: "Mr. Nimal Silva", assignedDoctor: "Dr. Sarah Jenkins", registeredAt: "2026-09-15T07:45:00Z", status: "WAITING", priority: "NORMAL" },
      { id: "Q-005", queueNo: "OPD-005", patientId: "PAT-2026-005", patientName: "Mrs. Kumari Dias", assignedDoctor: null, registeredAt: "2026-09-15T08:10:00Z", status: "WAITING", priority: "NORMAL" },
    ],
  });
}
