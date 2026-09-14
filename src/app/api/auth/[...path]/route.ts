import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const action = path.join("/");
    const body = await request.json();

    // Mock network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    switch (action) {
      case "login":
        if (body.email === "admin@amaz.com" && body.password === "ChangeMe123!") {
          return NextResponse.json({
            token: "mock-jwt-token-12345",
            user: { id: "1", name: "Test User", email: body.email },
          });
        }
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

      case "register":
        // Accept any registration for mockup
        if (body.email && body.password && body.name) {
          return NextResponse.json(
            { message: "User registered successfully" },
            { status: 201 }
          );
        }
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

      case "forgot-password":
        if (body.email) {
          return NextResponse.json({ message: "Reset link sent if email exists" });
        }
        return NextResponse.json({ error: "Email is required" }, { status: 400 });

      case "verify-email":
        if (body.token === "valid-token") {
          return NextResponse.json({ message: "Email verified successfully" });
        }
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

      default:
        return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
