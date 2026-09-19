import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:5000/api/reception/metrics", {
      cache: "no-store"
    });
    const json = await res.json();
    return NextResponse.json(json.data || {});
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch metrics" }, { status: 500 });
  }
}
