import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:5000/api/reception/patients", {
      cache: "no-store"
    });
    const json = await res.json();
    
    // Map fullName to name to maintain backwards compatibility with existing UI
    if (json.success && Array.isArray(json.data)) {
      json.data = json.data.map((patient: any) => ({
        ...patient,
        name: patient.fullName,
        contact: patient.phone,
        registeredAt: patient.createdAt
      }));
    }
    
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
