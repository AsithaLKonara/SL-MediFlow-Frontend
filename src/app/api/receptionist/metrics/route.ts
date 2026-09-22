import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/metrics`, {
      cache: "no-store"
    });
    const json = await res.json();
    return NextResponse.json(json.data || {});
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch metrics" }, { status: 500 });
  }
}
