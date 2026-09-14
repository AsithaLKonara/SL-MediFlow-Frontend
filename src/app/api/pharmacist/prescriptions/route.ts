import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    data: [
      { id: "RX-2026-001", patientId: "PAT-2026-002", patientName: "Mr. Kamal Jayasuriya", doctor: "Dr. Sarah Jenkins", drugs: [{ name: "Amlodipine", dosage: "5mg", frequency: "Once daily", duration: "30 days", qty: 30 }, { name: "Metformin", dosage: "500mg", frequency: "Twice daily", duration: "30 days", qty: 60 }], status: "PENDING", issuedAt: "2026-09-15T07:30:00Z" },
      { id: "RX-2026-002", patientId: "PAT-2026-005", patientName: "Mrs. Kumari Dias", doctor: "Dr. Sarah Jenkins", drugs: [{ name: "Paracetamol", dosage: "500mg", frequency: "PRN", duration: "7 days", qty: 21 }], status: "PENDING", issuedAt: "2026-09-15T08:00:00Z" },
      { id: "RX-2026-003", patientId: "PAT-2026-004", patientName: "Mr. Nimal Silva", doctor: "Dr. Robert Chen", drugs: [{ name: "Nitroglycerine SL", dosage: "0.5mg", frequency: "PRN", duration: "30 days", qty: 30 }, { name: "Aspirin", dosage: "75mg", frequency: "Once daily", duration: "30 days", qty: 30 }], status: "FULFILLED", issuedAt: "2026-09-15T06:15:00Z" },
      { id: "RX-2026-004", patientId: "PAT-2026-003", patientName: "Miss Dilini Fernando", doctor: "Dr. Priya Ramanathan", drugs: [{ name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", duration: "7 days", qty: 21 }, { name: "Ibuprofen", dosage: "400mg", frequency: "Twice daily", duration: "5 days", qty: 10 }], status: "PENDING", issuedAt: "2026-09-15T08:45:00Z" },
      { id: "RX-2026-005", patientId: "PAT-2026-007", patientName: "Mrs. Chamari Wickrama", doctor: "Dr. Sarah Jenkins", drugs: [{ name: "Cetirizine", dosage: "10mg", frequency: "Once daily", duration: "14 days", qty: 14 }], status: "PENDING", issuedAt: "2026-09-15T09:10:00Z" },
    ],
  });
}
