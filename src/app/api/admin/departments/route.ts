import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    data: [
      { id: "D-1", name: "Outpatient Dept (OPD)", queueSize: 24, activeStaff: 8, efficiency: 92, status: "NORMAL" },
      { id: "D-2", name: "Pharmacy", queueSize: 45, activeStaff: 4, efficiency: 88, status: "BUSY" },
      { id: "D-3", name: "Laboratory", queueSize: 12, activeStaff: 5, efficiency: 95, status: "NORMAL" },
      { id: "D-4", name: "Emergency", queueSize: 8, activeStaff: 12, efficiency: 85, status: "CRITICAL" },
      { id: "D-5", name: "Radiology", queueSize: 5, activeStaff: 3, efficiency: 90, status: "NORMAL" },
      { id: "D-6", name: "Inpatient Ward", queueSize: 120, activeStaff: 45, efficiency: 82, status: "BUSY" }
    ]
  });
}
