import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId") || "";
    const requestedDate = searchParams.get("date") || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    
    const queryParams = new URLSearchParams();
    if (doctorId) queryParams.append("doctorId", doctorId);
    if (requestedDate) queryParams.append("date", requestedDate);

    // We pass doctorId and date to filter the appointments strictly by scheduled day
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/appointments?${queryParams.toString()}`, {
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
