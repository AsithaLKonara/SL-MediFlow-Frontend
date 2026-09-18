import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return NextResponse.json({
    data: [
      { id: "PAT-2026-001", name: "Mrs. Amara Perera", dob: "1985-04-12", contact: "+94771234567", gender: "FEMALE", registeredAt: "2026-09-15T06:15:00Z", status: "ACTIVE" },
      { id: "PAT-2026-002", name: "Mr. Kamal Jayasuriya", dob: "1972-11-30", contact: "+94779876543", gender: "MALE", registeredAt: "2026-09-15T07:00:00Z", status: "ACTIVE" },
      { id: "PAT-2026-003", name: "Miss Dilini Fernando", dob: "2000-07-22", contact: "+94765432198", gender: "FEMALE", registeredAt: "2026-09-15T07:20:00Z", status: "ACTIVE" },
      { id: "PAT-2026-004", name: "Mr. Nimal Silva", dob: "1960-02-05", contact: "+94712345678", gender: "MALE", registeredAt: "2026-09-15T07:45:00Z", status: "ACTIVE" },
      { id: "PAT-2026-005", name: "Mrs. Kumari Dias", dob: "1990-09-18", contact: "+94756789012", gender: "FEMALE", registeredAt: "2026-09-15T08:10:00Z", status: "ACTIVE" },
    ],
    total: 24,
  });
}
