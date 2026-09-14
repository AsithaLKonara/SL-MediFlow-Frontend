import { NextResponse } from "next/server";

// In-memory store for mock data
let rbacData = [
  { role: "receptionist", permissions: { "Patient Registration": { create: true, read: true, update: true, delete: false }, "Queue Management": { create: true, read: true, update: true, delete: false }, "View Finance": { create: false, read: false, update: false, delete: false } } },
  { role: "doctor", permissions: { "Consultation": { create: true, read: true, update: true, delete: false }, "Prescribe Medicine": { create: true, read: true, update: true, delete: false }, "Request Lab": { create: true, read: true, update: true, delete: false }, "View Finance": { create: false, read: false, update: false, delete: false } } },
  { role: "pharmacist", permissions: { "Manage Inventory": { create: true, read: true, update: true, delete: false }, "Fulfill Prescription": { create: true, read: true, update: true, delete: false }, "Generate Bill": { create: true, read: true, update: true, delete: false } } },
  { role: "labtech", permissions: { "View Requests": { create: false, read: true, update: false, delete: false }, "Enter Results": { create: true, read: true, update: true, delete: false }, "Publish Report": { create: true, read: true, update: true, delete: false } } },
  { role: "cashier", permissions: { "Process Payments": { create: true, read: true, update: true, delete: false }, "View Finance": { create: false, read: true, update: false, delete: false } } }
];

export async function GET() {
  await new Promise((r) => setTimeout(r, 400));
  return NextResponse.json({ data: rbacData });
}

export async function POST(req: Request) {
  const body = await req.json();
  // Simply update our in-memory mock store
  const idx = rbacData.findIndex(r => r.role === body.role);
  if (idx > -1) {
    rbacData[idx].permissions = body.permissions;
  } else {
    rbacData.push(body);
  }
  
  await new Promise((r) => setTimeout(r, 600));
  return NextResponse.json({ success: true, message: "Configuration saved successfully" });
}
