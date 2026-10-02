import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/departments/doctors`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error("Failed to fetch doctors");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
  }
}
