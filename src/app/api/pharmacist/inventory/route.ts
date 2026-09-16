import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({
    data: [
      { id: "INV-001", name: "Amlodipine 5mg", category: "Cardiovascular", stock: 240, reorderLevel: 50, unit: "Tablet", unitPrice: 12.50, expiryDate: "2027-06-30", status: "IN_STOCK" },
      { id: "INV-002", name: "Metformin 500mg", category: "Diabetes", stock: 180, reorderLevel: 60, unit: "Tablet", unitPrice: 8.00, expiryDate: "2027-03-31", status: "IN_STOCK" },
      { id: "INV-003", name: "Paracetamol 500mg", category: "Analgesic", stock: 520, reorderLevel: 100, unit: "Tablet", unitPrice: 5.00, expiryDate: "2028-01-31", status: "IN_STOCK" },
      { id: "INV-004", name: "Amoxicillin 500mg", category: "Antibiotic", stock: 38, reorderLevel: 50, unit: "Capsule", unitPrice: 25.00, expiryDate: "2026-12-31", status: "LOW_STOCK" },
      { id: "INV-005", name: "Aspirin 75mg", category: "Cardiovascular", stock: 12, reorderLevel: 50, unit: "Tablet", unitPrice: 7.50, expiryDate: "2027-09-30", status: "LOW_STOCK" },
      { id: "INV-006", name: "Cetirizine 10mg", category: "Antihistamine", stock: 95, reorderLevel: 30, unit: "Tablet", unitPrice: 15.00, expiryDate: "2027-04-30", status: "IN_STOCK" },
      { id: "INV-007", name: "Ibuprofen 400mg", category: "Analgesic", stock: 8, reorderLevel: 40, unit: "Tablet", unitPrice: 10.00, expiryDate: "2027-02-28", status: "LOW_STOCK" },
      { id: "INV-008", name: "Nitroglycerine SL 0.5mg", category: "Cardiovascular", stock: 5, reorderLevel: 20, unit: "Tablet", unitPrice: 45.00, expiryDate: "2026-11-30", status: "LOW_STOCK" },
      { id: "INV-009", name: "Sumatriptan 50mg", category: "Neurology", stock: 60, reorderLevel: 20, unit: "Tablet", unitPrice: 120.00, expiryDate: "2027-08-31", status: "IN_STOCK" },
      { id: "INV-010", name: "Metoprolol 50mg", category: "Cardiovascular", stock: 145, reorderLevel: 40, unit: "Tablet", unitPrice: 18.00, expiryDate: "2027-05-31", status: "IN_STOCK" },
    ],
  });
}
