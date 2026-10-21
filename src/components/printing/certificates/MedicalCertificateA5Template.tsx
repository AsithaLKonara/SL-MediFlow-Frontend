import React from "react";

export interface MedicalCertificateA5Data {
  serialNo?: string;
  date?: string;
  patientName?: string;
  patientAddress?: string;
  diagnosis?: string;
  remarks?: string;
  recommended?: string; // e.g. "Medical Leave for 3 days from 20/10/2026 to 23/10/2026"
  doctorName?: string;
  doctorQualification?: string;
  doctorSlmcNo?: string;
  isManualBlank?: boolean;
}

interface MedicalCertificateA5TemplateProps {
  data: MedicalCertificateA5Data;
}

export const MedicalCertificateA5Template = React.forwardRef<
  HTMLDivElement,
  MedicalCertificateA5TemplateProps
>(({ data }, ref) => {
  const isBlank = !!data.isManualBlank;

  const doctorName = data.doctorName || "Dr. V.K.P.A. Mahesh Lakshman";
  const doctorQualification = data.doctorQualification || "MBBS - Karapitiya";
  const doctorSlmcNo = data.doctorSlmcNo || "27337";

  return (
    <div
      ref={ref}
      className="medical-cert-a5-root bg-white text-black p-4 mx-auto font-serif relative"
      style={{
        width: "210mm",
        height: "148mm",
        boxSizing: "border-box",
        fontSize: "12px",
        lineHeight: "1.4",
        color: "#111"
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @page {
            size: A5 landscape;
            margin: 0;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: #fff !important;
            }
            .medical-cert-a5-root {
              width: 210mm !important;
              height: 148mm !important;
              margin: 0 !important;
              padding: 4mm !important;
              box-shadow: none !important;
            }
          }
        `
        }}
      />

      {/* Outer Red Frame - Matches Image 2 */}
      <div className="w-full h-full border-2 border-[#D32F2F] flex relative overflow-hidden bg-white">
        {/* Left Orange/Red Solid Accent Bar with Vertical Rotated Text */}
        <div className="w-9 bg-[#E64A19] flex items-center justify-center shrink-0 border-r border-[#D32F2F]">
          <span
            className="text-white font-sans text-[10.5px] font-bold tracking-wide uppercase whitespace-nowrap select-none"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              letterSpacing: "0.5px"
            }}
          >
            The Certificate is not for Purpose of Leave from A Court of Law
          </span>
        </div>

        {/* Certificate Main Area */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          {/* Header Row: Title & Serial (Left) + Hospital & Doctor Stamp (Right) */}
          <div className="flex justify-between items-start">
            {/* Left Header: Title */}
            <div className="pt-2">
              <h1 className="text-xl font-bold tracking-wider text-[#D32F2F] uppercase font-serif">
                MEDICAL CERTIFICATE
              </h1>
              <div className="flex items-baseline gap-1 mt-1 text-[11px] text-gray-700">
                <span className="font-semibold text-slate-800">Serial No.</span>
                <span className="font-mono font-bold text-red-700 px-1 border-b border-dotted border-red-500">
                  {data.serialNo || (isBlank ? "........................" : "AMAZ-MC-0418")}
                </span>
              </div>
            </div>

            {/* Right Header: Hospital Brand & Doctor Credentials Box */}
            <div className="text-right flex items-start gap-4">
              {/* Doctor Credentials */}
              <div className="text-right text-[11px] font-sans text-gray-800 pt-1">
                <p className="font-bold text-[#D32F2F] text-[12px]">{doctorName}</p>
                <p className="font-medium text-gray-700">{doctorQualification}</p>
                <p className="font-semibold text-gray-600">SLMC Reg. NO. {doctorSlmcNo}</p>
              </div>

              {/* Hospital Logo & Address */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-7 h-7 text-[#D32F2F]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
                  </svg>
                  <div className="text-right">
                    <span className="text-base font-black tracking-wide text-[#D32F2F] font-sans block leading-none">
                      AMAZ
                    </span>
                    <span className="text-sm font-extrabold tracking-wide text-[#B71C1C] font-sans block leading-tight">
                      HOSPITAL
                    </span>
                  </div>
                </div>
                <p className="text-[9px] text-gray-500 font-sans italic">Delighting Our Health</p>
                <p className="text-[9px] text-gray-600 font-sans">Debarawewa, Tissamaharama</p>
                <p className="text-[9px] text-gray-600 font-sans">Reg. No. PHSRC/PH/306</p>
              </div>
            </div>
          </div>

          {/* Form Fields - Exact Dotted Underline Style matching Image 2 */}
          <div className="space-y-2.5 my-auto text-[12px] text-gray-900">
            {/* Date */}
            <div className="flex items-baseline">
              <span className="w-16 font-semibold text-[#D32F2F]">Date :</span>
              <div className="flex-1 border-b border-dotted border-red-400 pl-2 font-medium">
                {!isBlank && data.date ? data.date : <span>&nbsp;</span>}
              </div>
            </div>

            {/* Name & Address */}
            <div className="flex items-baseline">
              <span className="w-32 font-semibold text-[#D32F2F] whitespace-nowrap">
                Name & Address :
              </span>
              <div className="flex-1 border-b border-dotted border-red-400 pl-2 font-bold uppercase text-slate-900">
                {!isBlank && data.patientName ? (
                  <span>
                    {data.patientName} {data.patientAddress ? `, ${data.patientAddress}` : ""}
                  </span>
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            </div>
            {/* Name & Address line 2 */}
            <div className="w-full border-b border-dotted border-red-400 h-4">
              &nbsp;
            </div>

            {/* Diagnosis */}
            <div className="flex items-baseline">
              <span className="w-24 font-semibold text-[#D32F2F]">Diagnosis :</span>
              <div className="flex-1 border-b border-dotted border-red-400 pl-2 font-semibold text-slate-800">
                {!isBlank && data.diagnosis ? data.diagnosis : <span>&nbsp;</span>}
              </div>
            </div>

            {/* Remarks */}
            <div className="flex items-baseline">
              <span className="w-20 font-semibold text-[#D32F2F]">Remarks :</span>
              <div className="flex-1 border-b border-dotted border-red-400 pl-2">
                {!isBlank && data.remarks ? data.remarks : <span>&nbsp;</span>}
              </div>
            </div>
            {/* Remarks line 2 */}
            <div className="w-full border-b border-dotted border-red-400 h-4">
              &nbsp;
            </div>

            {/* Recommended */}
            <div className="flex items-baseline">
              <span className="w-28 font-semibold text-[#D32F2F]">Recommended :</span>
              <div className="flex-1 border-b border-dotted border-red-400 pl-2 font-semibold text-slate-800">
                {!isBlank && data.recommended ? data.recommended : <span>&nbsp;</span>}
              </div>
            </div>
            {/* Recommended line 2 */}
            <div className="w-full border-b border-dotted border-red-400 h-4">
              &nbsp;
            </div>
          </div>

          {/* Bottom Row: Signature */}
          <div className="pt-2 flex justify-start items-end">
            <div className="text-left w-64">
              <div className="border-b border-dotted border-red-400 h-6">&nbsp;</div>
              <p className="mt-1 text-[11px] font-semibold text-gray-800 font-sans">
                Signature of Medical Officer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MedicalCertificateA5Template.displayName = "MedicalCertificateA5Template";
