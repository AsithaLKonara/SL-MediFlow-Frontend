import React from "react";

export interface PhysicalFitnessCertificateData {
  patientName?: string;
  idNo?: string;
  height?: string;
  weight?: string;
  respiration?: string;
  bp?: string;
  dr?: string;
  rr?: string;
  pr?: string;
  scars?: string;
  lumps?: string;
  hearing?: string;
  visionR?: string;
  visionL?: string;
  ecg?: string;
  fbc?: string;
  ufr?: string;
  bGroupRh?: string;
  etc?: string;
  sgotSgpt?: string;
  scr?: string;
  esr?: string;
  sCholestol?: string;
  fbs?: string;
  allergy?: string;
  remarks?: string;
  doctorName?: string;
  candidateTitle?: "Mr" | "Mrs" | "Miss" | "Rev" | string;
  date?: string;
  isManualBlank?: boolean;
}

interface PhysicalFitnessCertificateTemplateProps {
  data: PhysicalFitnessCertificateData;
}

export const PhysicalFitnessCertificateTemplate = React.forwardRef<
  HTMLDivElement,
  PhysicalFitnessCertificateTemplateProps
>(({ data }, ref) => {
  const isBlank = !!data.isManualBlank;

  // Helper to render dotted underline with filled text
  const DottedVal = ({
    val,
    minWidth = "120px",
    className = "",
    placeholder = "......................................................................................................."
  }: {
    val?: string;
    minWidth?: string;
    className?: string;
    placeholder?: string;
  }) => {
    if (isBlank || !val) {
      return (
        <span
          className={`inline-block border-b border-dotted border-black/80 ${className}`}
          style={{ minWidth }}
        >
          &nbsp;
        </span>
      );
    }
    return (
      <span
        className={`inline-block border-b border-dotted border-black font-semibold text-slate-900 px-1 text-[13px] ${className}`}
        style={{ minWidth }}
      >
        {val}
      </span>
    );
  };

  return (
    <div
      ref={ref}
      className="fitness-certificate-root bg-white text-black p-8 sm:p-10 mx-auto font-serif"
      style={{
        width: "210mm",
        minHeight: "297mm",
        boxSizing: "border-box",
        fontSize: "13px",
        lineHeight: "1.5",
        color: "#111"
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: #fff !important;
            }
            .fitness-certificate-root {
              width: 100% !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
          }
        `
        }}
      />

      {/* Hospital Official Header - Matches Image 1 */}
      <div className="flex items-start justify-between pb-3 border-b-2 border-black">
        {/* Left / Center Logo */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="AMAZ Hospital" className="h-16 w-auto object-contain" />
          <div className="pt-2">
            <p className="text-[10px] text-gray-700 font-sans mt-0.5 font-medium">
              Company Reg. No : PV122007
            </p>
          </div>
        </div>

        {/* Right Contact Info */}
        <div className="text-right text-[10px] font-sans text-gray-700 space-y-0.5 leading-tight">
          <p className="flex items-center justify-end gap-1 font-medium">
            <span>✉</span> amazhospital88@gmail.com | amazhospital.lk
          </p>
          <p className="text-[9.5px] max-w-[240px]">
            Amaz Hospital (Pvt) Ltd. No 382/3, Debarawewa, Tissamaharama, Sri Lanka - 82600
          </p>
          <p className="font-semibold text-gray-900">
            ☎ +94 47 223 9090
          </p>
        </div>
      </div>

      {/* Certificate Title */}
      <div className="text-center mt-5 mb-4 space-y-1.5">
        <h1 className="text-xl font-bold tracking-wider uppercase underline underline-offset-4 decoration-2">
          PHYSICAL FITNESS CERTIFICATE
        </h1>
        <p className="text-[11px] font-bold text-gray-900 max-w-xl mx-auto leading-snug">
          To be obtained only from Gazette Government Medical officer of a Government undertaking
        </p>
      </div>

      {/* Numbered Form Content */}
      <div className="space-y-3.5 text-[12.5px] text-gray-900 pt-1">
        {/* 1. Name */}
        <div className="flex items-baseline">
          <span className="font-medium whitespace-nowrap">1. Name ( In block letters )</span>
          <span className="mx-1 font-bold">:-</span>
          <span className="flex-1">
            <DottedVal val={data.patientName?.toUpperCase()} minWidth="100%" className="uppercase" />
          </span>
        </div>

        {/* 2. ID No */}
        <div className="flex items-baseline">
          <span className="font-medium whitespace-nowrap">2. ID No</span>
          <span className="mx-1 font-bold">:-</span>
          <span className="flex-1">
            <DottedVal val={data.idNo} minWidth="100%" />
          </span>
        </div>

        {/* 3. Height & Weight */}
        <div className="flex items-baseline justify-between gap-6">
          <div className="flex items-baseline flex-1">
            <span className="font-medium whitespace-nowrap">3. Height</span>
            <span className="mx-1 font-bold">:-</span>
            <span className="flex-1">
              <DottedVal val={data.height} minWidth="100%" />
            </span>
          </div>
          <div className="flex items-baseline flex-1">
            <span className="font-medium whitespace-nowrap">Weight</span>
            <span className="mx-1 font-bold">:-</span>
            <span className="flex-1">
              <DottedVal val={data.weight} minWidth="100%" />
            </span>
          </div>
        </div>

        {/* 4. Respiration */}
        <div className="flex items-baseline">
          <span className="font-medium whitespace-nowrap">4. Respiration</span>
          <span className="mx-1 font-bold">:-</span>
          <span className="flex-1">
            <DottedVal val={data.respiration} minWidth="100%" />
          </span>
        </div>

        {/* 5. CVS */}
        <div>
          <div className="font-medium mb-1">5. CVS :-</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 pl-6">
            <div className="flex items-baseline">
              <span className="w-10 font-medium">BP</span>
              <span className="flex-1">
                <DottedVal val={data.bp} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-10 font-medium">RR</span>
              <span className="flex-1">
                <DottedVal val={data.rr} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-10 font-medium">DR</span>
              <span className="flex-1">
                <DottedVal val={data.dr} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-10 font-medium">PR</span>
              <span className="flex-1">
                <DottedVal val={data.pr} minWidth="100%" />
              </span>
            </div>
          </div>
        </div>

        {/* 6. Abdomen */}
        <div>
          <div className="font-medium mb-1">6. Abdomen :-</div>
          <div className="space-y-1.5 pl-6">
            <div className="flex items-baseline">
              <span className="w-16 font-medium">Scars</span>
              <span className="flex-1">
                <DottedVal val={data.scars} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-16 font-medium">Lumps</span>
              <span className="flex-1">
                <DottedVal val={data.lumps} minWidth="100%" />
              </span>
            </div>
          </div>
        </div>

        {/* 7. Hearing */}
        <div className="flex items-baseline">
          <span className="font-medium whitespace-nowrap">7. Hearing</span>
          <span className="mx-1 font-bold">:-</span>
          <span className="flex-1">
            <DottedVal val={data.hearing} minWidth="100%" />
          </span>
        </div>

        {/* 8. Vision */}
        <div>
          <div className="font-medium mb-1">8. Vision :-</div>
          <div className="grid grid-cols-2 gap-x-8 pl-6">
            <div className="flex items-baseline">
              <span className="w-8 font-medium">R</span>
              <span className="flex-1">
                <DottedVal val={data.visionR} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-8 font-medium">L</span>
              <span className="flex-1">
                <DottedVal val={data.visionL} minWidth="100%" />
              </span>
            </div>
          </div>
        </div>

        {/* 9. Investigation */}
        <div>
          <div className="font-medium mb-1">9. Investigation :-</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 pl-6">
            {/* Col 1 */}
            <div className="flex items-baseline">
              <span className="w-28 font-medium">ECG</span>
              <span className="flex-1">
                <DottedVal val={data.ecg} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-28 font-medium">SGOT/SGPT</span>
              <span className="flex-1">
                <DottedVal val={data.sgotSgpt} minWidth="100%" />
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-28 font-medium">FBC</span>
              <span className="flex-1">
                <DottedVal val={data.fbc} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-28 font-medium">SCR</span>
              <span className="flex-1">
                <DottedVal val={data.scr} minWidth="100%" />
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-28 font-medium">UFR</span>
              <span className="flex-1">
                <DottedVal val={data.ufr} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-28 font-medium">ESR</span>
              <span className="flex-1">
                <DottedVal val={data.esr} minWidth="100%" />
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-28 font-medium">B/GROUP/RH</span>
              <span className="flex-1">
                <DottedVal val={data.bGroupRh} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-28 font-medium">S.CHOLESTOL</span>
              <span className="flex-1">
                <DottedVal val={data.sCholestol} minWidth="100%" />
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-28 font-medium">ETC</span>
              <span className="flex-1">
                <DottedVal val={data.etc} minWidth="100%" />
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-28 font-medium">FBS</span>
              <span className="flex-1">
                <DottedVal val={data.fbs} minWidth="100%" />
              </span>
            </div>
          </div>
        </div>

        {/* 10. Allergy & Remarks */}
        <div className="flex items-baseline">
          <span className="font-medium whitespace-nowrap">10. Allergy if any</span>
          <span className="mx-1 font-bold">:-</span>
          <span className="flex-1">
            <DottedVal val={data.allergy || "None"} minWidth="100%" />
          </span>
        </div>

        <div className="flex items-baseline">
          <span className="font-medium whitespace-nowrap">Any other Remarks</span>
          <span className="mx-1 font-bold">:-</span>
          <span className="flex-1">
            <DottedVal val={data.remarks} minWidth="100%" />
          </span>
        </div>
      </div>

      {/* Certification Declaration Paragraph - Exact match to Image 1 */}
      <div className="mt-6 pt-2 text-[12.5px] leading-relaxed text-gray-900 space-y-2">
        <p className="text-justify">
          I, Dr.{" "}
          <DottedVal
            val={data.doctorName}
            minWidth="240px"
            className="font-bold text-center"
          />
          , after Personal examination of the case do here by certify that{" "}
          <span className="font-semibold underline">
            {data.candidateTitle || "Mr/ Mrs/ Miss/ Rev"}
          </span>{" "}
          <DottedVal
            val={data.patientName}
            minWidth="260px"
            className="font-bold uppercase"
          />
        </p>
        <p className="font-medium">
          Is found physicaly fit to undergo professional trannings /education or profession.
        </p>
      </div>

      {/* Signatures Footer */}
      <div className="mt-14 pt-4 flex justify-between items-end text-[12px] font-sans">
        <div className="text-center w-52">
          <div className="border-b border-dotted border-black/80 pb-1">
            <span className="font-semibold">{data.date || ""}</span>
          </div>
          <p className="mt-1 font-bold text-gray-800">Date</p>
        </div>

        <div className="text-center w-56">
          <div className="border-b border-dotted border-black/80 pb-1">
            &nbsp;
          </div>
          <p className="mt-1 font-bold text-gray-800">Signature</p>
        </div>
      </div>
    </div>
  );
});

PhysicalFitnessCertificateTemplate.displayName = "PhysicalFitnessCertificateTemplate";
