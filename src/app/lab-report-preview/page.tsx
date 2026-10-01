"use client";

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { LabReportTemplate, LabReportData } from '@/components/print/LabReportTemplate';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const mockData: LabReportData = {
  referenceNo: "67 0068 20/12/22",
  sampleDateTime: "20/12/2022 11:08",
  reportDateTime: "20/12/2022 15:07",
  patientName: "MRS. IMASHA KAVINDI",
  ageGender: "23 Y/F",
  patientIds: "AHH2006090 / AHH2010368",
  referredBy: "..",
  testProfile: "COMPLETE BLOOD COUNT",
  reportType: "AUTOMATED COUNT",
  departmentInfo: "OPD/KOTTAWA/ALS",
  pageInfo: "Page 1 of 1",
  mltName: "MLT",
  categories: [
    {
      categoryName: "NONE",
      tests: [
        { id: '1', name: "TOTAL WHITE CELL COUNT", result: "4.9", unit: "10^9/L", flag: "N", referenceValue: "4.0 - 11.0" }
      ]
    },
    {
      categoryName: "DIFFERENTIAL COUNT",
      tests: [
        { id: '2', name: "NEUTROPHILS", result: "35.0", unit: "%      1.7", flag: "L", referenceValue: "40%-80% (2.0-7.0)" },
        { id: '3', name: "LYMPHOCYTES", result: "50.4", unit: "%      2.5", flag: "H", referenceValue: "20%-40% (1.0-3.0)" },
        { id: '4', name: "MONOCYTES", result: "13.8", unit: "%      0.7", flag: "H", referenceValue: "02%-10% (0.2-1.0)" },
        { id: '5', name: "EOSINOPHILS", result: "0.2", unit: "%      0.0", flag: "L", referenceValue: "01%-06% (0.02-0.5)" },
        { id: '6', name: "BASOPHILS", result: "0.6", unit: "%      0.0", flag: "N", referenceValue: "<0.1%-02% (0.02-0.1)" },
      ]
    },
    {
      categoryName: "HAEMOGLOBIN AND RBC PARAMETERS",
      tests: [
        { id: '7', name: "HAEMOGLOBIN", result: "12.4", unit: "g/dL", flag: "N", referenceValue: "11.8 - 14.8" },
        { id: '8', name: "RED BLOOD CELLS", result: "4.48", unit: "10^12/L", flag: "N", referenceValue: "3.8 - 4.8" },
        { id: '9', name: "MEAN CELL VOLUME", result: "82.8", unit: "fl", flag: "N", referenceValue: "76.0 - 96.0" },
        { id: '10', name: "HAEMATOCRIT", result: "37.1", unit: "L/L(%)", flag: "N", referenceValue: "36.0 - 44.0" },
        { id: '11', name: "MEAN CELL HAEMOGLOBIN", result: "27.7", unit: "pg", flag: "N", referenceValue: "27.0 - 33.0" },
        { id: '12', name: "M.C.H. CONCENTRATION", result: "33.4", unit: "g/dL", flag: "N", referenceValue: "32.0 - 36.0" },
        { id: '13', name: "RED CELLS DISTRIBUTION WIDTH", result: "13.3", unit: "%", flag: "N", referenceValue: "12.0 - 15.0" },
        { id: '14', name: "PLATELET COUNT", result: "380", unit: "10^9/L", flag: "N", referenceValue: "150 - 400" },
      ]
    }
  ]
};

export default function LabReportPreview() {
  const componentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "Lab_Report_670068",
    pageStyle: `
      @page { size: A4; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `
  });

  return (
    <div className="min-h-screen bg-neutral-200 p-8 flex flex-col items-center pb-20">
      <div className="mb-6 flex gap-4">
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
          <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
        </Button>
      </div>
      
      {/* A4 Paper Container with shadow */}
      <div className="shadow-2xl overflow-hidden bg-white">
        <LabReportTemplate ref={componentRef} data={mockData} />
      </div>
    </div>
  );
}
