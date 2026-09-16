import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    data: [
      {
        id: "INV-2026-0001",
        visitId: "V-2026-000521",
        patientId: "AMZ-P-000006",
        patientName: "Kamal Perera",
        type: "CENTRAL_INVOICE",
        description: "Visit Invoice",
        items: [
          { name: "Doctor Consultation (Dr. Silva)", qty: 1, unitPrice: 2000.00, subtotal: 2000.00 },
          { name: "Pharmacy Charge (RX-2026-000125)", qty: 1, unitPrice: 1250.00, subtotal: 1250.00 },
          { name: "Laboratory (Full Blood Count, ECG)", qty: 1, unitPrice: 2300.00, subtotal: 2300.00 },
        ],
        amount: 5550.00,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      {
        id: "INV-2026-0002",
        visitId: "V-2026-000519",
        patientId: "PAT-004",
        patientName: "Patient B",
        type: "CENTRAL_INVOICE",
        description: "Visit Invoice",
        items: [
          { name: "Doctor Consultation (Dr. Perera)", qty: 1, unitPrice: 2500.00, subtotal: 2500.00 },
          { name: "Pharmacy Charge (RX-2026-000122)", qty: 1, unitPrice: 700.00, subtotal: 700.00 },
        ],
        amount: 3200.00,
        status: "COMPLETED",
        createdAt: "2026-09-15T09:10:00Z",
      }
    ],
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  
  const newPayment = {
    id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
    visitId: body.visitId || "Unknown",
    patientId: body.patientId || "Unknown",
    patientName: body.patientName || "Unknown",
    type: "CENTRAL_INVOICE",
    description: "Visit Invoice",
    items: [],
    amount: body.amount || 0,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({ success: true, data: newPayment });
}
