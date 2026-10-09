"use client";

import { useEffect, useState } from "react";
import { LabReportTemplate, LabReportData, LabTestResult } from "@/components/print/LabReportTemplate";

interface Props {
  referenceNo: string;
}

export default function PublicReportViewer({ referenceNo }: Props) {
  const [reportData, setReportData] = useState<LabReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/reports/${referenceNo}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.error || "Report not found");

        const req = res.data;
        const patient = req.Patient;
        const dob = patient?.dateOfBirth;
        const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 30;
        const gender = patient?.gender || "U";
        const doctor = req.Visit?.User?.fullName || req.doctorId || "Unknown";

        // Build categories from results
        const resultsMap = new Map<string, LabTestResult[]>();

        if (req.results && req.results.length > 0) {
          // Use saved results with persisted flag and referenceRange
          req.results.forEach((r: any) => {
            const cat = "NONE";
            if (!resultsMap.has(cat)) resultsMap.set(cat, []);
            resultsMap.get(cat)!.push({
              id: r.id,
              name: r.biomarker,
              result: r.value,
              unit: "",
              flag: r.flag || (r.isOutOfRange ? "H" : "N"),
              referenceValue: r.referenceRange || ""
            });
          });
        } else {
          // Fall back to biomarkers from test catalog
          (req.items || []).forEach((item: any) => {
            const biomarkers = item.LabTest?.biomarkers || [];
            biomarkers.forEach((b: any) => {
              const cat = b.category || "NONE";
              if (!resultsMap.has(cat)) resultsMap.set(cat, []);
              resultsMap.get(cat)!.push({
                id: b.id,
                name: b.name,
                result: "—",
                unit: b.unit || "",
                flag: "N",
                referenceValue: b.referenceRange || ""
              });
            });
          });
        }

        const categories = Array.from(resultsMap.entries()).map(([cat, tests]) => ({
          categoryName: cat,
          tests
        }));

        const testName = req.items?.[0]?.LabTest?.name || "Lab Report";
        const refNo = req.id.slice(0, 8).toUpperCase();

        setReportData({
          referenceNo: refNo,
          sampleDateTime: new Date(req.requestedAt).toLocaleString(),
          reportDateTime: req.updatedAt ? new Date(req.updatedAt).toLocaleString() : new Date().toLocaleString(),
          patientName: patient?.fullName || "Patient",
          ageGender: `${age} Y/${gender.charAt(0).toUpperCase()}`,
          patientIds: patient?.patientId || req.patientId,
          patientPhone: patient?.phone || "—",
          referredBy: doctor,
          testProfile: testName,
          reportType: "AUTOMATED COUNT",
          departmentInfo: "LABORATORY",
          pageInfo: "Page 1 of 1",
          mltName: "AMAZ Laboratories",
          reportUrl: req.reportUrl || `${window.location.origin}/reports/${refNo}`,
          categories
        });
      })
      .catch(e => setError(e.message || "Failed to load report"))
      .finally(() => setLoading(false));
  }, [referenceNo]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground font-medium">Loading your lab report…</p>
      </div>
    </div>
  );

  if (error || !reportData) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md p-8 bg-card text-card-foreground rounded-xl shadow border">
        <div className="text-5xl">🔬</div>
        <h1 className="text-xl font-bold text-destructive">Report Not Found</h1>
        <p className="text-muted-foreground text-sm">{error || "This report does not exist or has not been published yet."}</p>
        <p className="text-xs text-muted-foreground/70">Reference: {referenceNo?.toUpperCase?.() ?? "—"}</p>
        <p className="text-xs text-muted-foreground/70 mt-4">
          AMAZ Hospital · Tissamaharama · 0472239090
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8">
      {/* Verification Banner */}
      <div className="max-w-[210mm] mx-auto mb-4 px-2">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-green-800 dark:text-green-400 font-bold text-sm">Verified Lab Report</p>
            <p className="text-green-600 dark:text-green-500 text-xs">This report was issued by AMAZ Hospital Laboratories. Ref: <strong>{referenceNo.toUpperCase()}</strong></p>
          </div>
        </div>
      </div>

      {/* Report */}
      <div className="max-w-[210mm] mx-auto shadow-2xl ring-1 ring-border">
        <LabReportTemplate data={reportData} />
      </div>

      <div className="text-center mt-6 text-xs text-muted-foreground/70">
        www.amazhospital.com · info@amazhospital.com · 0472239090
      </div>
    </div>
  );
}
