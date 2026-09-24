import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/pending`, {
      cache: "no-store"
    });
    const backendData = await res.json();
    
    // Map backend array to the format the frontend expects
    const data = (Array.isArray(backendData) ? backendData : []).map((rx: any) => ({
      id: rx.id,
      patientId: rx.patientId,
      patientName: rx.patientName || "Unknown Patient",
      doctor: rx.doctorName || "Unknown Doctor",
      drugs: (rx.items || []).map((item: any) => ({
        name: item.drugName || "Unknown Drug",
        dosage: item.dosage || "",
        frequency: item.frequency || "",
        duration: item.duration || "",
        qty: item.dispenseQty || 0
      })),
      status: rx.status,
      issuedAt: rx.createdAt
    }));
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
