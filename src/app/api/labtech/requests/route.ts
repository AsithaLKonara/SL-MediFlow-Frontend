import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:5000/api/lab/requests", {
      cache: "no-store"
    });
    const json = await res.json();
    
    if (json.success && Array.isArray(json.data)) {
      json.data = json.data.map((req: any) => ({
        id: req.id,
        patientId: req.patientId,
        patientName: req.Patient?.fullName || "Unknown Patient",
        patientAge: req.Patient?.dateOfBirth ? new Date().getFullYear() - new Date(req.Patient.dateOfBirth).getFullYear() : 45,
        doctor: req.Visit?.User?.fullName || "Unknown Doctor",
        clinicalIndication: "General investigation", // Backend doesn't have clinicalIndication yet
        tests: (req.items || []).map((item: any) => ({
          name: item.LabTest?.name || "Unknown Test",
          unit: item.LabTest?.unit || "",
          referenceRange: item.LabTest?.referenceRange || "",
          result: null, // Pending requests have no results yet
          status: "PENDING"
        })),
        priority: req.priority || "NORMAL",
        status: req.status,
        requestedAt: req.requestedAt
      }));
    }
    
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
