import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    const headers: Record<string, string> = {};
    if (authHeader) headers["authorization"] = authHeader;
    if (cookieHeader) headers["cookie"] = cookieHeader;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctors/today`, {
      headers,
      cache: "no-store",
    });
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Resilient fallback to /reception/doctors if /doctors/today is unavailable
    const fallbackRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/doctors`, {
      headers,
      cache: "no-store",
    });

    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      const mapped = Array.isArray(fallbackData.data)
        ? fallbackData.data.map((doc: any) => ({
            id: doc.id,
            fullName: doc.fullName || doc.name,
            specialty: doc.specialty,
            department: doc.department || doc.Department?.name,
            status: "SCHEDULED",
            arrivedAt: null,
          }))
        : [];
      return NextResponse.json({ success: true, data: mapped });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    console.error("Proxy error fetching doctors today:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}
