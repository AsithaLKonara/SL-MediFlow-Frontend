import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/doctors`, {
      cache: "no-store"
    });
    const json = await res.json();
    
    // Map fullName to name to maintain backwards compatibility with existing UI
    if (json.success && Array.isArray(json.data)) {
      json.data = json.data.map((doc: any) => ({
        ...doc,
        name: doc.fullName
      }));
    }
    
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
