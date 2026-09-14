import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return NextResponse.json({
    data: [
      { id: "DOC-001", name: "Dr. Sarah Jenkins", specialty: "General Medicine", available: true },
      { id: "DOC-002", name: "Dr. Robert Chen", specialty: "Cardiology", available: true },
      { id: "DOC-003", name: "Dr. Priya Ramanathan", specialty: "Pediatrics", available: true },
      { id: "DOC-004", name: "Dr. Mark Wilson", specialty: "General Medicine", available: false },
      { id: "DOC-005", name: "Dr. Anika Patel", specialty: "Orthopedics", available: true },
    ],
  });
}
