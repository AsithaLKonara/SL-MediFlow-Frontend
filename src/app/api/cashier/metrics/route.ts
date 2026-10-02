import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/cashier-metrics`, {
      cache: "no-store"
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch cashier metrics");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch cashier metrics" }, { status: 500 });
  }
}
