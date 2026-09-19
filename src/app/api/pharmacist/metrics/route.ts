import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:5000/api/pharmacy/metrics", {
      cache: "no-store"
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch pharmacy metrics" }, { status: 500 });
  }
}
