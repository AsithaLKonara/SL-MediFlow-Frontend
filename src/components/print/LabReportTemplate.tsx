import React, { forwardRef } from "react";

export interface LabTestResult {
  id: string;
  name: string;
  result: string | number;
  unit: string;
  flag: "H" | "L" | "N" | "" | null;
  referenceValue: string;
}

export interface LabTestCategory {
  categoryName: string;
  tests: LabTestResult[];
}

export interface LabReportData {
  referenceNo: string;
  sampleDateTime: string;
  reportDateTime: string;
  patientName: string;
  patientPhone: string;
  ageGender: string;
  patientIds: string;
  referredBy: string;
  testProfile: string;
  categories: LabTestCategory[];
  mltName: string;
  departmentInfo: string;
  pageInfo: string;
  reportType: string;
  reportUrl?: string;
}

interface LabReportTemplateProps {
  data: LabReportData;
}

export const LabReportTemplate = forwardRef<HTMLDivElement, LabReportTemplateProps>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 text-[11px] mx-auto overflow-hidden relative"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-2 border-red-900 pb-4 mb-4 font-sans">
        <div className="w-1/2">
          <div className="text-xs text-red-900 font-bold mb-1">www.amazhospital.com</div>
          <h1 className="text-lg font-bold text-red-900 tracking-tight leading-tight uppercase">
            Confidential Laboratory Report
          </h1>
          <p className="text-[9px] font-semibold text-red-800 mb-2">
            Member of Clinical and Laboratory Standards Institute, U.S.A.
          </p>
          {/* Mock Certifications Row */}
          <div className="flex gap-2 mb-3">
            <div className="h-6 w-8 bg-gray-200 border border-gray-400 flex items-center justify-center text-[6px]">ISO</div>
            <div className="h-6 w-8 bg-gray-200 border border-gray-400 flex items-center justify-center text-[6px]">CAP</div>
            <div className="h-6 w-8 bg-gray-200 border border-gray-400 flex items-center justify-center text-[6px]">AACC</div>
            <div className="h-6 w-12 bg-gray-200 border border-gray-400 flex items-center justify-center text-[6px] font-bold">35+ Yrs</div>
          </div>
          <div className="text-[10px] leading-tight">
            <span className="font-bold">Amaz Hospital Holdings</span>, debarawewa, Tissamaharama<br />
            T. +94 47 223 9090 | info@amazhospital.com
          </div>
        </div>

        <div className="w-1/4 flex flex-col items-center pt-4">
          {/* QR Code */}
          <div className="w-16 h-16 p-1 border border-gray-300">
             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.reportUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/reports/${data.referenceNo}`)}`} alt="QR Code" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="w-1/4 flex flex-col items-end">
          <div className="text-[10px] mb-2 font-semibold">LAB/FOR-07</div>
          <img src="/logo.png" alt="Amaz Hospital" className="h-14 object-contain mb-1" />
          <div className="text-red-900 font-bold text-xl tracking-wider">AMAZ</div>
          <div className="text-red-900 text-sm tracking-[0.2em]">LABORATORIES</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full relative">
        <div className="text-center font-bold mb-4 text-sm">
          ** {data.reportType} **
        </div>
        
        <div className="flex justify-between font-bold mb-6">
          <div className="w-1/2"></div>
          <div className="w-1/2 flex justify-between">
            <span>** {data.departmentInfo} **</span>
            <span>{data.pageInfo}</span>
          </div>
        </div>

        {/* Patient Info Grid */}
        <div className="grid grid-cols-[150px_1fr] gap-x-2 gap-y-1 mb-6 uppercase">
          <div>REFERENCE No.</div>
          <div>: {data.referenceNo}</div>
          
          <div>SAMPLE DATE & TIME</div>
          <div className="flex justify-between w-full max-w-lg">
            <span>: {data.sampleDateTime}</span>
            <span>AGE : {data.ageGender}</span>
          </div>

          <div>REPORT DATE & TIME</div>
          <div className="flex gap-4 w-full max-w-lg">
            <span>: {data.reportDateTime}</span>
            <span>{data.patientIds}</span>
          </div>

          <div>PATIENT</div>
          <div className="flex justify-between w-full max-w-lg">
            <span>: {data.patientName}</span>
            <span>PHONE : {data.patientPhone || "N/A"}</span>
          </div>

          <div>REFERRED BY</div>
          <div>: {data.referredBy}</div>

          <div className="font-bold underline">TEST/PROFILE</div>
          <div className="font-bold">: {data.testProfile}</div>
        </div>

        {/* Results Table Header */}
        <div className="w-full border-t border-b border-black py-1 flex uppercase font-bold mb-4">
          <div className="w-5/12">TEST</div>
          <div className="w-3/12 flex justify-between pr-4">
             <span>RESULT</span>
             <span></span>
          </div>
          <div className="w-1/12 text-center">FLAG</div>
          <div className="w-3/12">REFERENCE VALUE</div>
        </div>

        {/* Results Categories */}
        <div className="w-full flex flex-col gap-4 min-h-[400px]">
          {data.categories.map((cat, i) => (
            <div key={i} className="w-full">
              {cat.categoryName && cat.categoryName !== 'NONE' && (
                <div className="font-bold underline mb-2 uppercase">{cat.categoryName}</div>
              )}
              <div className="flex flex-col gap-1">
                {cat.tests.map((test, j) => (
                  <div key={j} className="w-full flex">
                    <div className="w-5/12 pl-4">{test.name}</div>
                    <div className="w-3/12 flex items-center pr-4 relative">
                       <span className="w-1/2 text-left">{test.result}</span>
                       <span className="w-1/2 text-left pl-2">{test.unit}</span>
                    </div>
                    <div className="w-1/12 text-center font-bold">
                       {test.flag && test.flag !== 'N' && (
                           <span className={test.flag === 'H' || test.flag === 'L' ? 'bg-black text-white px-1' : ''}>{test.flag}</span>
                       )}
                    </div>
                    <div className="w-3/12">{test.referenceValue}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Signature Area */}
        <div className="flex justify-end mt-16 mb-20 pr-12">
           <div className="flex flex-col items-center">
              <div className="w-32 border-b border-black mb-1"></div>
              <div className="font-bold">{data.mltName}</div>
           </div>
        </div>
      </div>

      {/* Footer Consultants */}
      <div className="absolute bottom-4 left-0 w-full px-8 text-[7px] font-sans flex justify-between border-t border-gray-400 pt-2 text-red-900">
         <div className="text-center w-1/4">
            <div className="font-bold uppercase">Dr. NISHADYA RANASINGHE</div>
            <div>MBBS, D.PATH, M.D.(HAEMATOLOGY) FRCPA</div>
            <div>Cons. Haematologist / Pathologist</div>
         </div>
         <div className="text-center w-1/4">
            <div className="font-bold uppercase">Dr. CHANDRIKA MEEGAMA</div>
            <div>D. Path, M.D.(Chemical Pathology)</div>
            <div>Consultant Chemical Pathologist</div>
         </div>
         <div className="text-center w-1/4">
            <div className="font-bold uppercase">Dr. S. D. ATUKORALA</div>
            <div>MBBS, MD, Dip. Bact, FACP, FRC Path</div>
            <div>Clinical Bacteriologist</div>
         </div>
         <div className="text-center w-1/4">
            <div className="font-bold uppercase">PROF. L. R. AMERASEKARA</div>
            <div>MBBS, (cey) Ph. D (Lond)</div>
            <div>Cons. Histopathologist</div>
         </div>
      </div>
    </div>
  );
});

LabReportTemplate.displayName = "LabReportTemplate";
