"use client";

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { TokenThermalReceipt, ThermalTokenItem } from "@/components/printing/TokenThermalReceipt";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const sampleTokens: ThermalTokenItem[] = [
  {
    id: "tok-doc-001",
    tokenNumber: "05",
    department: "DOCTOR",
    doctorName: "Dr. V.K.P.A. Mahesh Lakshman",
    roomNumber: "ROOM 2",
    patientName: "Kamal Wickramasinghe",
    patientAge: 42,
    patientPhone: "0771234567",
    appointmentDate: new Date().toISOString(),
    bookingReference: "AMAZ-20261107-0012"
  },
  {
    id: "tok-lab-002",
    tokenNumber: "LA-01",
    department: "LAB",
    doctorName: "Full Blood Count (FBC)",
    roomNumber: "LAB A",
    patientName: "Kamal Wickramasinghe",
    patientAge: 42,
    patientPhone: "0771234567",
    appointmentDate: new Date().toISOString(),
    bookingReference: "AMAZ-20261107-0012"
  }
];

export default function TokenThermalPreviewPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [tokens] = useState<ThermalTokenItem[]>(sampleTokens);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Token_Receipt_80mm",
  });

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-sm mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">80mm Thermal Token Preview</h1>
          <p className="text-sm text-gray-500">Live preview of the thermal queue token slip (Doctor & Lab partitions)</p>
        </div>
        <Button onClick={() => handlePrint()} className="gap-2">
          <Printer className="w-4 h-4" />
          Test Print (80mm)
        </Button>
      </div>

      <div className="bg-white border-2 border-dashed border-gray-400 shadow-md p-4 flex flex-col items-center">
        <p className="text-[10px] text-gray-400 mb-2">--- 80mm Thermal Roll Boundary ---</p>
        <TokenThermalReceipt
          ref={printRef}
          tokens={tokens}
          masterBarcode="AMAZ-20261107-0012"
          forceVisible={true}
        />
      </div>
    </div>
  );
}

