import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:5000/api/booking/appointments", {
      cache: "no-store"
    });
    const json = await res.json();
    
    // Map backend Appointment schema to frontend Queue schema
    if (json.success && Array.isArray(json.data)) {
      json.data = json.data.map((apt: any) => {
        // Map backend statuses to frontend expected statuses if necessary
        let mappedStatus = apt.status;
        if (mappedStatus === "BOOKED") mappedStatus = "WAITING";
        if (mappedStatus === "IN_PROGRESS") mappedStatus = "IN_CONSULTATION";

        return {
          id: apt.id,
          queueNo: apt.tokenNumber,
          patientId: apt.patientId,
          patientName: apt.Patient?.fullName || "Unknown",
          assignedDoctor: apt.User?.fullName || null,
          registeredAt: apt.createdAt,
          status: mappedStatus,
          priority: "NORMAL" // Hardcoded for now as backend doesn't track priority yet
        };
      });
    }
    
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
