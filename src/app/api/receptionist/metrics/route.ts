import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return NextResponse.json({
    registeredToday: 24,
    currentQueueSize: 18,
    availableDoctors: 7,
    pendingAppointments: 5,
    nextInQueue: [
      { queueNo: "OPD-001", patientName: "Mrs. Amara Perera", doctor: "Dr. Sarah Jenkins", status: "IN_CONSULTATION" },
      { queueNo: "OPD-002", patientName: "Mr. Kamal Jayasuriya", doctor: "Dr. Robert Chen", status: "WAITING" },
      { queueNo: "OPD-003", patientName: "Miss Dilini Fernando", doctor: "Unassigned", status: "WAITING" },
      { queueNo: "OPD-004", patientName: "Mr. Nimal Silva", doctor: "Dr. Sarah Jenkins", status: "WAITING" },
      { queueNo: "OPD-005", patientName: "Mrs. Kumari Dias", doctor: "Unassigned", status: "WAITING" },
    ],
  });
}
