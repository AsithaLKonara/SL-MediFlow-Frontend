import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    data: [
      {
        id: "PAY-2026-101",
        patientId: "PAT-2026-002",
        patientName: "Mr. Kamal Jayasuriya",
        type: "PHARMACY",
        description: "Pharmacy Bill (BILL-1001)",
        items: [
          { name: "Amlodipine 5mg", qty: 30, unitPrice: 12.50, subtotal: 375.00 },
          { name: "Metformin 500mg", qty: 60, unitPrice: 8.00, subtotal: 480.00 },
        ],
        amount: 855.00,
        status: "PENDING",
        createdAt: "2026-09-15T09:05:00Z",
      },
      {
        id: "PAY-2026-102",
        patientId: "PAT-2026-005",
        patientName: "Mrs. Kumari Dias",
        type: "CONSULTATION",
        description: "OPD Consultation (Dr. Sarah Jenkins)",
        items: [
          { name: "Standard Consultation Fee", qty: 1, unitPrice: 50.00, subtotal: 50.00 },
        ],
        amount: 50.00,
        status: "PENDING",
        createdAt: "2026-09-15T09:10:00Z",
      },
      {
        id: "PAY-2026-103",
        patientId: "PAT-2026-003",
        patientName: "Miss Dilini Fernando",
        type: "LAB",
        description: "Lab Test Request (LAB-2026-003)",
        items: [
          { name: "Full Blood Count", qty: 1, unitPrice: 40.00, subtotal: 40.00 },
          { name: "Urine Full Report", qty: 1, unitPrice: 20.00, subtotal: 20.00 },
          { name: "Blood Culture", qty: 1, unitPrice: 60.00, subtotal: 60.00 },
        ],
        amount: 120.00,
        status: "COMPLETED",
        createdAt: "2026-09-15T08:30:00Z",
      },
      {
        id: "PAY-2026-104",
        patientId: "PAT-2026-012",
        patientName: "Mr. Ajith Perera",
        type: "CONSULTATION",
        description: "OPD Consultation (Dr. Robert Chen)",
        items: [
          { name: "Specialist Consultation Fee", qty: 1, unitPrice: 75.00, subtotal: 75.00 },
        ],
        amount: 75.00,
        status: "PENDING",
        createdAt: "2026-09-15T09:15:00Z",
      },
    ],
  });
}
