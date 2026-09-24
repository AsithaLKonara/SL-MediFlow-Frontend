import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctors/today`, {
      cache: "no-store",
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch doctors today status");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Proxy error fetching doctors today:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
