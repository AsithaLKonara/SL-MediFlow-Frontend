import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId") || "";
    
    // We pass doctorId if it exists to filter the metrics for the specific doctor
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctors/metrics${doctorId ? `?doctorId=${doctorId}` : ''}`, {
      cache: "no-store"
    });
    
    const json = await res.json();
    return NextResponse.json(json.data || {});
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch doctor metrics" }, { status: 500 });
  }
}
