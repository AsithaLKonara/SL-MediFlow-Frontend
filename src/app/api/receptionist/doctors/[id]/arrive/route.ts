import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await fetch(`http://localhost:5000/api/doctors/${id}/attendance/arrive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Proxy error marking doctor arrived:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
