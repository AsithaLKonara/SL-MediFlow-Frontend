"use client";

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { DotMatrixBillReceipt, DotMatrixReceiptData } from "@/components/printing/DotMatrixBillReceipt";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const sampleReceiptData: DotMatrixReceiptData = {
  receiptId: "inv-982348a1",
  invoiceNo: "INV-98234",
  tokenNumber: "07",
  bookingReference: "SLMF-20261107-0012",
  refNo: "SLMF-20261107-0012",
  date: new Date().toISOString(),
  patientName: "Kamal Wickramasinghe",
  patientAge: 42,
  patientPhone: "0771234567",
  doctorName: "Dr. V.K.P.A. Mahesh Lakshman",
  cashierName: "Asitha L.",
  items: [
    { name: "Doctor Consultation Fee", qty: 1, price: 1500, total: 1500, department: "OPD" },
    { name: "Full Blood Count (FBC)", qty: 1, price: 1800, total: 1800, department: "LAB" },
    { name: "Paracetamol 500mg", qty: 20, price: 10, total: 200, department: "PHARMACY", isMedicine: true },
    { name: "Amoxicillin 500mg", qty: 15, price: 40, total: 600, department: "PHARMACY", isMedicine: true }
  ],
  subtotal: 4100,
  discount: 100,
  total: 4000,
  paymentMethod: "CASH",
  receivedAmount: 5000,
  change: 1000
};

export default function DotMatrixBillPreviewPage() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [data] = useState<DotMatrixReceiptData>(sampleReceiptData);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: "Bill_Receipt_140x140",
  });

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-sm mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">140mm × 140mm Dot Matrix Bill Preview</h1>
          <p className="text-sm text-gray-500">Live preview of the dot matrix tractor/cut-sheet bill receipt</p>
        </div>
        <Button onClick={() => handlePrint()} className="gap-2">
          <Printer className="w-4 h-4" />
          Test Print
        </Button>
      </div>

      {/* Visible Container for On-Screen Inspection & Playwright Assertions */}
      <div
        id="preview-sheet"
        className="bg-white border-2 border-dashed border-gray-400 shadow-md p-2 flex flex-col items-center"
        style={{ width: "140mm", minHeight: "140mm" }}
      >
        <p className="text-[10px] text-gray-400 mb-1">--- 140mm × 140mm Sheet Boundary ---</p>
        <div className="w-[132mm] h-[132mm] bg-white border border-gray-300">
          {/* We render DotMatrixBillReceipt here with printable ref */}
          <div className="h-full">
            <DotMatrixBillReceipt ref={receiptRef} receiptData={data} cashierName={data.cashierName} forceVisible={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
