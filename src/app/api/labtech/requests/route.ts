import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    data: [
      {
        id: "LAB-2026-001",
        patientId: "PAT-2026-002",
        patientName: "Mr. Kamal Jayasuriya",
        patientAge: 53,
        doctor: "Dr. Sarah Jenkins",
        clinicalIndication: "Hypertension follow-up, monitor lipid levels",
        tests: [
          { name: "HbA1c", unit: "%", referenceRange: "4.0 - 5.6", result: null, status: "PENDING" },
          { name: "Lipid Profile", unit: "mg/dL", referenceRange: "LDL < 100", result: null, status: "PENDING" },
        ],
        priority: "NORMAL",
        status: "PENDING",
        requestedAt: "2026-09-15T07:00:00Z",
      },
      {
        id: "LAB-2026-002",
        patientId: "PAT-2026-004",
        patientName: "Mr. Nimal Silva",
        patientAge: 65,
        doctor: "Dr. Robert Chen",
        clinicalIndication: "Routine checkup",
        tests: [
          { name: "Full Blood Count", unit: "cells/μL", referenceRange: "WBC 4,000-11,000", result: null, status: "IN_PROGRESS" },
        ],
        priority: "NORMAL",
        status: "IN_PROGRESS",
        requestedAt: "2026-09-15T07:45:00Z",
      },
      {
        id: "LAB-2026-003",
        patientId: "PAT-2026-003",
        patientName: "Miss Dilini Fernando",
        patientAge: 26,
        doctor: "Dr. Priya Ramanathan",
        clinicalIndication: "Fever investigation, rule out infection",
        tests: [
          { name: "Full Blood Count", unit: "cells/μL", referenceRange: "WBC 4,000-11,000", result: null, status: "PENDING" },
          { name: "Urine Full Report", unit: "visual", referenceRange: "No abnormalities", result: null, status: "PENDING" },
          { name: "Blood Culture", unit: "qualitative", referenceRange: "No growth", result: null, status: "PENDING" },
        ],
        priority: "URGENT",
        status: "PENDING",
        requestedAt: "2026-09-15T07:20:00Z",
      },
      {
        id: "LAB-2026-004",
        patientId: "PAT-2026-009",
        patientName: "Miss Harini Balasuriya",
        patientAge: 28,
        doctor: "Dr. Sarah Jenkins",
        clinicalIndication: "Headache — rule out thyroid dysfunction",
        tests: [
          { name: "Thyroid Profile", unit: "mIU/L", referenceRange: "TSH: 0.4-4.0", result: null, status: "PENDING" },
        ],
        priority: "NORMAL",
        status: "PENDING",
        requestedAt: "2026-09-15T09:00:00Z",
      },
      {
        id: "LAB-2026-005",
        patientId: "PAT-2026-011",
        patientName: "Mr. Rohan Gunasekara",
        patientAge: 38,
        doctor: "Dr. Sarah Jenkins",
        clinicalIndication: "Back pain, check for inflammatory markers",
        tests: [
          { name: "ESR", unit: "mm/hr", referenceRange: "0-20 (M), 0-30 (F)", result: "32 mm/hr", status: "COMPLETED" },
          { name: "CRP", unit: "mg/L", referenceRange: "< 10", result: "28 mg/L", status: "COMPLETED" },
        ],
        priority: "NORMAL",
        status: "PUBLISHED",
        requestedAt: "2026-09-15T06:30:00Z",
      },
    ],
  });
}
