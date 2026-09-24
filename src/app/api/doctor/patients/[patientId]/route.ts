import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/patients/${patientId}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

