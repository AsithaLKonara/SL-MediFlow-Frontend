import { NextResponse } from "next/server";

export async function GET() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    data: [
      { id: "1", name: "Dr. Sarah Jenkins", email: "sarah@amaz.com", role: "DOCTOR", status: "ACTIVE" },
      { id: "2", name: "John Doe", email: "john@amaz.com", role: "PHARMACIST", status: "ACTIVE" },
      { id: "3", name: "Alice Smith", email: "alice@amaz.com", role: "RECEPTIONIST", status: "ACTIVE" },
      { id: "4", name: "Dr. Robert Chen", email: "robert@amaz.com", role: "DOCTOR", status: "INACTIVE" },
      { id: "5", name: "Emily White", email: "emily@amaz.com", role: "LAB_TECHNICIAN", status: "ACTIVE" },
    ],
    total: 142
  });
}
