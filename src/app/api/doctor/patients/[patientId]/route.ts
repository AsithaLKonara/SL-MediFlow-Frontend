import { NextResponse } from "next/server";

const patients: Record<string, object> = {
  "PAT-2026-002": {
    id: "PAT-2026-002",
    name: "Mr. Kamal Jayasuriya",
    dob: "1973-03-15",
    age: 53,
    gender: "MALE",
    contact: "+94779876543",
    bloodGroup: "B+",
    allergies: ["Penicillin", "Aspirin"],
    chronicConditions: ["Hypertension", "Type 2 Diabetes"],
    medicalHistory: [
      { date: "2026-08-10", doctor: "Dr. Sarah Jenkins", diagnosis: "Hypertension review", prescription: ["Amlodipine 5mg", "Metformin 500mg"] },
      { date: "2026-06-22", doctor: "Dr. Robert Chen", diagnosis: "Chest pain investigation — ECG normal", prescription: ["Nitroglycerine PRN"] },
    ],
    labResults: [
      { date: "2026-08-10", test: "HbA1c", result: "7.2%", status: "COMPLETED" },
      { date: "2026-08-10", test: "Lipid Profile", result: "LDL: 130 mg/dL", status: "COMPLETED" },
    ],
  },
  "PAT-2026-004": {
    id: "PAT-2026-004",
    name: "Mr. Nimal Silva",
    dob: "1960-02-05",
    age: 65,
    gender: "MALE",
    contact: "+94712345678",
    bloodGroup: "O+",
    allergies: [],
    chronicConditions: ["Arthritis"],
    medicalHistory: [
      { date: "2026-07-05", doctor: "Dr. Sarah Jenkins", diagnosis: "Routine checkup — all clear", prescription: ["Paracetamol 500mg PRN"] },
    ],
    labResults: [
      { date: "2026-07-05", test: "Full Blood Count", result: "Within normal limits", status: "COMPLETED" },
    ],
  },
  "PAT-2026-007": {
    id: "PAT-2026-007",
    name: "Mrs. Chamari Wickrama",
    dob: "1984-11-20",
    age: 42,
    gender: "FEMALE",
    contact: "+94765109876",
    bloodGroup: "A-",
    allergies: ["Sulfonamides"],
    chronicConditions: [],
    medicalHistory: [],
    labResults: [],
  },
  "PAT-2026-009": {
    id: "PAT-2026-009",
    name: "Miss Harini Balasuriya",
    dob: "1998-05-12",
    age: 28,
    gender: "FEMALE",
    contact: "+94701234567",
    bloodGroup: "AB+",
    allergies: [],
    chronicConditions: [],
    medicalHistory: [
      { date: "2026-05-30", doctor: "Dr. Priya Ramanathan", diagnosis: "Migraine — stable", prescription: ["Sumatriptan 50mg PRN", "Ibuprofen 400mg"] },
    ],
    labResults: [],
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  await new Promise((r) => setTimeout(r, 300));
  const patient = patients[patientId];
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  return NextResponse.json(patient);
}
