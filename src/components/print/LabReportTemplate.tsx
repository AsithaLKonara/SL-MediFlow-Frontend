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
      className="bg-white text-black p-8 text-[13px] mx-auto overflow-hidden relative leading-normal"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Redesigned Premium Clinical Header Section */}
      <div className="border-b-2 border-red-900 pb-3 mb-3 font-sans">
        <div className="flex justify-between items-start gap-4">
          {/* Left: Brand Identity & Accreditations */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <img src="/logo.png" alt="SL MediFlow" className="h-14 w-auto object-contain" />
              <div>
                <div className="text-[13.5px] font-bold tracking-[0.18em] text-red-900 uppercase">
                  SL MediFlow Laboratories & Diagnostic Centre
                </div>
                <div className="text-[10.5px] font-semibold text-slate-600 tracking-wide uppercase">
                  Department of Pathology & Clinical Laboratory Sciences
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 leading-snug mt-1">
              <span>SL Medi Flow (Pvt) Ltd. No. 123, Healthcare Boulevard, Colombo 07, Sri Lanka</span>
              <span className="mx-1 text-slate-300">•</span>
              <span className="font-medium text-slate-800">Reg: PHSRC/PH/306</span>
              <br />
              <span>Hotline: +94 11 234 5678</span>
              <span className="mx-1 text-slate-300">•</span>
              <span>contact@slmediflow.com</span>
              <span className="mx-1 text-slate-300">•</span>
              <span className="text-red-900 font-semibold">slmediflow.lk</span>
            </div>

            {/* Quality & Accreditation Badges */}
            <div className="flex items-center gap-1.5 mt-2">
              <div className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                ISO 15189:2022 Accredited
              </div>
              <div className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider">
                CLSI Member (USA)
              </div>
              <div className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider">
                Bio-Rad EQAS Certified
              </div>
            </div>
          </div>

          {/* Right: Security, Digital Verification & QR */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <div className="text-right">
              <div className="text-[9.5px] uppercase tracking-wider font-bold text-red-900 mb-0.5">
                Authentic Clinical Report
              </div>
              <div className="text-[11.5px] font-mono font-bold text-slate-900">
                {data.referenceNo}
              </div>
              <div className="text-[8.5px] text-slate-500 mt-0.5 font-sans">
                Scan to verify online
              </div>
              <div className="text-[8.5px] font-mono text-slate-400 mt-0.5">
                DOC: LAB/REP-07
              </div>
            </div>
            <div className="w-16 h-16 p-1 bg-white border border-slate-300 rounded shadow-xs flex items-center justify-center shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                  data.reportUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/reports/${data.referenceNo}`
                )}`}
                alt="QR Code"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full relative">
        {/* Report Banner Bar */}
        <div className="flex items-center justify-between bg-red-950 text-white px-3 py-1.5 rounded mb-3 font-sans">
          <div className="text-[13px] font-black uppercase tracking-wider flex items-center gap-2">
            <span>●</span>
            <span>{data.reportType || "Confidential Laboratory Diagnostic Report"}</span>
          </div>
          <div className="text-[11.5px] font-medium tracking-wide flex items-center gap-3">
            <span>{data.departmentInfo ? `** ${data.departmentInfo} **` : "** CLINICAL DIAGNOSTICS **"}</span>
            <span className="text-red-200 font-mono text-[10.5px]">{data.pageInfo || "Page 1 of 1"}</span>
          </div>
        </div>

        {/* Executive Patient & Specimen Demographics Matrix */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-4 font-sans text-[11px] bg-slate-50/40">
          <div className="grid grid-cols-3 divide-x divide-slate-300">
            {/* Column 1: Patient Identity */}
            <div className="p-2.5 space-y-1">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                Patient Demographics
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 block">Patient Full Name</span>
                <span className="font-bold text-slate-900 uppercase text-[13.5px] block truncate">
                  {data.patientName}
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <div>
                  <span className="text-[9.5px] text-slate-500 block">Age / Gender</span>
                  <span className="font-semibold text-slate-800 text-[11.5px]">{data.ageGender || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-500 block">Contact</span>
                  <span className="font-mono text-slate-800 text-[11.5px]">{data.patientPhone || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Specimen & Timeline */}
            <div className="p-2.5 space-y-1">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                Specimen & Reference
              </div>
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-[9.5px] text-slate-500 block">Lab Reference No</span>
                  <span className="font-bold font-mono text-red-900 text-[12.5px]">
                    {data.referenceNo}
                  </span>
                </div>
                {data.patientIds && (
                  <span className="text-[9.5px] font-mono text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                    {data.patientIds}
                  </span>
                )}
              </div>
              <div className="space-y-0.5 pt-0.5">
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-600">Sample Date & Time:</span>
                  <span className="font-medium text-slate-900 font-mono text-[11px]">{data.sampleDateTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-600">Report Date & Time:</span>
                  <span className="font-medium text-slate-900 font-mono text-[11px]">{data.reportDateTime}</span>
                </div>
              </div>
            </div>

            {/* Column 3: Clinical Care Team & Order */}
            <div className="p-2.5 space-y-1">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                Clinical Referral
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 block">Referred By Consultant</span>
                <span className="font-bold text-slate-900 block truncate text-[11.5px]">
                  {data.referredBy || "OPD Doctor / Consultant"}
                </span>
              </div>
              <div className="pt-0.5">
                <span className="text-[9.5px] text-slate-500 block">Test / Investigation Profile</span>
                <span className="font-bold text-red-900 uppercase text-[12px] block truncate">
                  {data.testProfile}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table Header */}
        <div className="w-full border-t-2 border-b-2 border-black py-1.5 flex uppercase font-bold text-[13px] mb-3">
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
                <div className="font-bold underline mb-2 uppercase text-[13px]">{cat.categoryName}</div>
              )}
              <div className="flex flex-col gap-1">
                {cat.tests.map((test, j) => (
                  <div key={j} className="w-full flex py-0.5 text-[13px]">
                    <div className="w-5/12 pl-4">{test.name}</div>
                    <div className="w-3/12 flex items-center pr-4 relative">
                       <span className="w-1/2 text-left font-medium">{test.result}</span>
                       <span className="w-1/2 text-left pl-2 text-slate-700">{test.unit}</span>
                    </div>
                    <div className="w-1/12 text-center font-bold">
                       {test.flag && test.flag !== 'N' && (
                           <span className={test.flag === 'H' || test.flag === 'L' ? 'bg-black text-white px-1.5 py-0.5 text-[12px] font-black' : ''}>{test.flag}</span>
                       )}
                    </div>
                    <div className="w-3/12 text-slate-800">{test.referenceValue}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Signature Area */}
        <div className="flex justify-end mt-12 mb-16 pr-12">
           <div className="flex flex-col items-center">
              <div className="w-36 border-b-2 border-black mb-1"></div>
              <div className="font-bold text-[13px]">{data.mltName}</div>
              <div className="text-[10px] text-slate-600 font-sans">Medical Laboratory Technologist</div>
           </div>
        </div>
      </div>

      {/* Footer Consultants */}
      <div className="absolute bottom-4 left-0 w-full px-8 text-[9.5px] font-sans flex justify-between border-t border-gray-400 pt-2.5 text-red-900 leading-tight">
         <div className="text-center w-1/4 px-1">
            <div className="font-bold uppercase text-[10px]">Dr. NISHADYA RANASINGHE</div>
            <div className="text-slate-700 text-[8.5px]">MBBS, D.PATH, M.D.(HAEMATOLOGY) FRCPA</div>
            <div className="text-slate-600 text-[8.5px]">Cons. Haematologist / Pathologist</div>
         </div>
         <div className="text-center w-1/4 px-1">
            <div className="font-bold uppercase text-[10px]">Dr. CHANDRIKA MEEGAMA</div>
            <div className="text-slate-700 text-[8.5px]">D. Path, M.D.(Chemical Pathology)</div>
            <div className="text-slate-600 text-[8.5px]">Consultant Chemical Pathologist</div>
         </div>
         <div className="text-center w-1/4 px-1">
            <div className="font-bold uppercase text-[10px]">Dr. S. D. ATUKORALA</div>
            <div className="text-slate-700 text-[8.5px]">MBBS, MD, Dip. Bact, FACP, FRC Path</div>
            <div className="text-slate-600 text-[8.5px]">Clinical Bacteriologist</div>
         </div>
         <div className="text-center w-1/4 px-1">
            <div className="font-bold uppercase text-[10px]">PROF. L. R. AMERASEKARA</div>
            <div className="text-slate-700 text-[8.5px]">MBBS, (cey) Ph. D (Lond)</div>
            <div className="text-slate-600 text-[8.5px]">Cons. Histopathologist</div>
         </div>
      </div>
    </div>
  );
});

LabReportTemplate.displayName = "LabReportTemplate";
