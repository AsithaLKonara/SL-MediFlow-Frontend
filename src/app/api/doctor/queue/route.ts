import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId") || "";
    
    // We pass doctorId if it exists to filter the appointments
    const res = await fetch(`http://localhost:5000/api/booking/appointments${doctorId ? `?doctorId=${doctorId}` : ''}`, {
      cache: "no-store"
    });
    
    const json = await res.json();
    
    if (json.success && Array.isArray(json.data)) {
      json.data = json.data.map((apt: any) => {
        let mappedStatus = apt.status;
        if (mappedStatus === "BOOKED") mappedStatus = "WAITING";
        if (mappedStatus === "IN_PROGRESS") mappedStatus = "IN_CONSULTATION";

        return {
          id: apt.id,
          queueNo: apt.tokenNumber,
          patientId: apt.patientId,
          patientName: apt.Patient?.fullName || "Unknown",
          age: apt.Patient?.dateOfBirth ? new Date().getFullYear() - new Date(apt.Patient.dateOfBirth).getFullYear() : 45,
          gender: apt.Patient?.gender || "UNKNOWN",
          reason: apt.department || "Consultation",
          priority: "NORMAL",
          status: mappedStatus,
          waitingSince: apt.createdAt
        };
      });
    }
    
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
