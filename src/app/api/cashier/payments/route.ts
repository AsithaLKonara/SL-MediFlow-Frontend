import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:5000/api/billing/invoices", {
      cache: "no-store"
    });
    const backendData = await res.json();
    
    const data = (Array.isArray(backendData) ? backendData : []).map((inv: any) => ({
      id: inv.id,
      visitId: inv.visitId || "Walk-in",
      patientId: inv.patientId || "Unknown",
      patientName: inv.Patient?.fullName || "Walk-in Patient",
      type: "CENTRAL_INVOICE",
      description: "Visit Invoice",
      items: (inv.lineItems || []).map((item: any) => ({
        name: item.description,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.total
      })),
      amount: inv.totalAmount,
      status: inv.status,
      createdAt: inv.createdAt
    }));
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
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
