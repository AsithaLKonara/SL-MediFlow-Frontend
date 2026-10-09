"use client";

import { use, useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Printer, FlaskConical, Plus, Trash2, Save, Globe } from "lucide-react";
import Link from "next/link";
import { useReactToPrint } from 'react-to-print';
import { LabReportTemplate, LabReportData } from "@/components/print/LabReportTemplate";
import { TestNameInput, saveToTestMemory } from "@/components/lab/TestNameInput";
import { useAuth } from "@/components/providers/AuthProvider";

// ---------- Types ----------

interface TestItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  referenceRange: string;
}

interface ResultEntry {
  id: string;
  name: string;
  category: string;
  result: string;
  unit: string;
  flag: "H" | "L" | "N" | "" | null;
  referenceRange: string;
  isManualFlag: boolean;
}

interface LabRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  gender: string;
  doctor: string;
  tests: TestItem[];
  priority: string;
  status: string;
  requestedAt: string;
}

// ---------- Helpers ----------

function getFlag(result: string, referenceRange: string): "H" | "L" | "N" | "" | null {
  if (!result || !referenceRange) return "";
  const numMatch = result.match(/[\d.]+/);
  if (!numMatch) return "N";
  
  const val = parseFloat(numMatch[0]);

  // Handle Range: "4.0 - 11.0"
  const refMatch = referenceRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (refMatch) {
    const low = parseFloat(refMatch[1]);
    const high = parseFloat(refMatch[2]);
    if (val < low) return "L";
    if (val > high) return "H";
    return "N";
  }

  // Handle Less Than: "< 200"
  const lessMatch = referenceRange.match(/<\s*([\d.]+)/);
  if (lessMatch) {
    if (val >= parseFloat(lessMatch[1])) return "H";
    return "N";
  }

  // Handle Greater Than: "> 40"
  const greaterMatch = referenceRange.match(/>\s*([\d.]+)/);
  if (greaterMatch) {
    if (val <= parseFloat(greaterMatch[1])) return "L";
    return "N";
  }

  return "N";
}

// ---------- Component ----------

export default function LabResultsPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);

  const [request, setRequest] = useState<LabRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const [results, setResults] = useState<ResultEntry[]>([]);

  const [reportMeta, setReportMeta] = useState({
    referenceNo: "",
    sampleDateTime: "",
    reportDateTime: "",
    patientName: "",
    patientPhone: "",
    ageGender: "",
    patientIds: "",
    referredBy: "",
    testProfile: "",
    reportType: "AUTOMATED COUNT",
    departmentInfo: "LABORATORY",
    pageInfo: "Page 1 of 1",
    mltName: "MLT Signature"
  });

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [reportUrl, setReportUrl] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  // ---------- Data Load ----------

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load request");
        return r.json();
      })
      .then((data: any[]) => {
        const req = data.find((x: any) => x.id === requestId);
        if (!req) { setLoading(false); return; }

        const gender = req.Patient?.gender || "U";
        const dob = req.Patient?.dateOfBirth;
        const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 30;
        const testName = req.items?.[0]?.LabTest?.name || "Lab Report";

        const mappedTests: TestItem[] = (req.items || []).flatMap((item: any) => {
          if (item.LabTest?.biomarkers?.length > 0) {
            return item.LabTest.biomarkers.map((b: any) => ({
              id: b.id, name: b.name, category: b.category || "NONE",
              unit: b.unit || "", referenceRange: b.referenceRange || ""
            }));
          }
          return [{ id: item.LabTest?.id, name: item.LabTest?.name, category: "NONE",
            unit: item.LabTest?.unit || "", referenceRange: item.LabTest?.referenceRange || "" }];
        });

        setRequest({
          id: req.id,
          patientId: req.Patient?.patientId || req.patientId,
          patientName: req.Patient?.fullName || `Patient`,
          patientAge: age, gender,
          doctor: req.Visit?.User?.fullName || req.doctorId || "Unknown",
          tests: mappedTests,
          priority: req.priority || "ROUTINE",
          status: req.status,
          requestedAt: req.requestedAt
        });

        const initialResults: ResultEntry[] = mappedTests.map(t => {
          const existing = req.results?.find((r: any) => r.biomarker === t.name);
          return {
            id: existing?.id || crypto.randomUUID(),
            name: t.name,
            category: t.category,
            result: existing?.value || "",
            unit: t.unit,
            flag: existing?.flag || "",
            referenceRange: existing?.referenceRange || t.referenceRange,
            isManualFlag: !!existing?.flag
          };
        });
        setResults(initialResults);

        if (req.status === "COMPLETED") setPublished(true);

        const refNo = req.id.slice(0, 8).toUpperCase();
        setReportMeta({
          referenceNo: refNo,
          sampleDateTime: new Date(req.requestedAt).toLocaleString(),
          reportDateTime: new Date().toLocaleString(),
          patientName: req.Patient?.fullName || "Patient",
          patientPhone: req.Patient?.phone || "",
          ageGender: `${age} Y/${gender.charAt(0).toUpperCase()}`,
          patientIds: req.Patient?.patientId || req.patientId,
          referredBy: req.Visit?.User?.fullName || req.doctorId || "Unknown",
          testProfile: testName,
          reportType: "AUTOMATED COUNT",
          departmentInfo: "LABORATORY",
          pageInfo: "Page 1 of 1",
          mltName: "MLT Signature"
        });

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [requestId]);

  // ---------- Result Entry Handlers ----------

  const updateEntry = (id: string, updates: Partial<ResultEntry>) => {
    setResults(prev => prev.map(entry => {
      if (entry.id !== id) return entry;
      const updated = { ...entry, ...updates };
      if ((updates.result !== undefined || updates.referenceRange !== undefined) && !updated.isManualFlag) {
        updated.flag = getFlag(updated.result, updated.referenceRange);
      }
      return updated;
    }));
  };

  const handleRowBlur = (entry: ResultEntry) => {
    if (entry.name.trim() && entry.referenceRange.trim()) {
      saveToTestMemory({ name: entry.name, unit: entry.unit, referenceRange: entry.referenceRange });
    }
  };

  const addRow = (category: string) => {
    setResults(prev => [...prev, {
      id: crypto.randomUUID(), name: "", category, result: "",
      unit: "", flag: "", referenceRange: "", isManualFlag: false
    }]);
  };

  const removeRow = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const handleMetaChange = (field: string, value: string) => {
    setReportMeta(prev => ({ ...prev, [field]: value }));
  };

  // ---------- Action Handlers ----------

  const buildApiPayload = () => results.map(e => ({
    biomarker: e.name,
    value: e.result,
    flag: e.flag || "N",
    referenceRange: e.referenceRange,
    isOutOfRange: e.flag === "H" || e.flag === "L",
    notes: ""
  }));

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests/${requestId}/results`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ results: buildApiPayload() })
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Results saved.");
    } catch {
      toast.error("Failed to save results.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `LabReport_${reportMeta.referenceNo}`,
    pageStyle: `@page { size: A4; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; } }`
  });

  const handlePublish = async () => {
    if (!token) return;
    setPublishing(true);
    const url = `${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/reports/${reportMeta.referenceNo}`;
    setReportUrl(url);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests/${requestId}/publish`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          results: buildApiPayload(),
          reportUrl: url,
          referenceNo: reportMeta.referenceNo,
          testProfile: reportMeta.testProfile
        })
      });
      if (!res.ok) throw new Error("Publish failed");
      setPublished(true);
      toast.success("Report published! SMS notification sent to patient.", { duration: 5000 });
      // Auto-print after publish
      setTimeout(() => handlePrint(undefined), 500);
    } catch {
      toast.error("Failed to publish report.");
    } finally {
      setPublishing(false);
    }
  };

  // ---------- PDF Data ----------

  if (loading || !request) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  const categories = Array.from(new Set(results.map(r => r.category)));

  const reportData: LabReportData = {
    ...reportMeta,
    reportUrl: reportUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/reports/${reportMeta.referenceNo}`,
    categories: categories.map(cat => ({
      categoryName: cat,
      tests: results.filter(r => r.category === cat).map(e => ({
        id: e.id, name: e.name, result: e.result,
        unit: e.unit, flag: e.flag, referenceValue: e.referenceRange
      }))
    }))
  };

  // ---------- Render ----------

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">

      {/* ===== Action Bar ===== */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-lg shadow-sm border sticky top-0 z-20">
        <Link href="/labtech/requests">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div className="h-6 w-px bg-border" />
        <div className="flex-1">
          <p className="font-bold text-sm text-foreground">{reportMeta.patientName}</p>
          <p className="text-xs text-muted-foreground">Ref: {reportMeta.referenceNo} · {reportMeta.testProfile}</p>
        </div>

        {published && <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">✓ Published</Badge>}

        {/* Save */}
        <Button variant="outline" size="sm" onClick={handleSave} isLoading={saving} className="gap-1.5">
          <Save className="w-4 h-4" />
          Save
        </Button>

        {/* Print */}
        <Button variant="outline" size="sm" onClick={() => handlePrint(undefined)} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print
        </Button>

        {/* Publish */}
        <Button
          onClick={handlePublish}
          disabled={published}
          isLoading={publishing}
          size="sm"
          className="gap-1.5 bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
        >
          <Globe className="w-4 h-4" />
          {published ? "Published" : "Publish & SMS"}
        </Button>
      </div>

      {/* ===== Main Split Layout ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Left: Forms */}
        <div className="space-y-4 h-[calc(100vh-9rem)] overflow-auto pr-1">

          {/* Metadata */}
          <Card className="border-blue-500/20">
            <CardHeader className="bg-blue-50/60 dark:bg-blue-900/10 pb-3 pt-4 px-4">
              <CardTitle className="text-sm text-blue-900 dark:text-blue-400">📄 Report Metadata</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-3">
              {[
                ["Reference No.", "referenceNo"],
                ["Patient Name", "patientName"],
                ["Patient ID (MRN)", "patientIds"],
                ["Patient Phone", "patientPhone"],
                ["Age / Gender", "ageGender"],
                ["Sample Date & Time", "sampleDateTime"],
                ["Report Date & Time", "reportDateTime"],
                ["Referred By", "referredBy"],
              ].map(([label, field]) => (
                <div key={field} className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</label>
                  <Input
                    value={(reportMeta as any)[field]}
                    onChange={e => handleMetaChange(field, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Test / Profile</label>
                <Input value={reportMeta.testProfile} onChange={e => handleMetaChange("testProfile", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">MLT Name (Signature)</label>
                <Input value={reportMeta.mltName} onChange={e => handleMetaChange("mltName", e.target.value)} className="h-8 text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Biomarker Results */}
          <Card className="border-amber-500/20">
            <CardHeader className="bg-amber-50/60 dark:bg-amber-900/10 pb-3 pt-4 px-4">
              <CardTitle className="text-sm text-amber-900 dark:text-amber-500 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> Biomarker Results
              </CardTitle>
              <CardDescription className="text-xs">Type to autocomplete from saved tests. All fields are editable.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">

              {categories.map(category => (
                <div key={category} className="space-y-2">
                  {category !== "NONE" && (
                    <h3 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase border-b border-red-200 dark:border-red-900/30 pb-1">
                      {category}
                    </h3>
                  )}

                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-muted-foreground uppercase px-1">
                    <div className="col-span-4">TEST</div>
                    <div className="col-span-3">RESULT</div>
                    <div className="col-span-2">FLAG</div>
                    <div className="col-span-3">REFERENCE</div>
                  </div>

                  {/* Rows */}
                  {results.filter(r => r.category === category).map(entry => {
                    const isBad = entry.flag === "H" || entry.flag === "L";
                    return (
                      <div
                        key={entry.id}
                        className={`grid grid-cols-12 gap-1 items-center rounded-md border p-1.5 transition-colors ${
                          isBad
                            ? "border-red-400/40 bg-red-50 dark:bg-red-950/20"
                            : "bg-muted/30 border-border"
                        }`}
                      >
                        {/* Test Name with Autocomplete */}
                        <div className="col-span-4">
                          <TestNameInput
                            value={entry.name}
                            onChange={val => updateEntry(entry.id, { name: val })}
                            onSelect={mem => updateEntry(entry.id, {
                              name: mem.name,
                              unit: mem.unit,
                              referenceRange: mem.referenceRange,
                              flag: getFlag(entry.result, mem.referenceRange),
                              isManualFlag: false
                            })}
                            onBlur={() => handleRowBlur(entry)}
                          />
                        </div>

                        {/* Result */}
                        <div className="col-span-3">
                          <Input
                            placeholder="Value"
                            value={entry.result}
                            onChange={e => updateEntry(entry.id, { result: e.target.value })}
                            className={`h-8 text-xs ${isBad ? "border-red-400 text-red-700 dark:text-red-400 font-bold focus-visible:ring-red-400" : ""}`}
                          />
                        </div>

                        {/* Flag */}
                        <div className="col-span-2">
                          <Select
                            value={entry.flag || "N"}
                            onValueChange={(val: any) => updateEntry(entry.id, { flag: val, isManualFlag: true })}
                          >
                            <SelectTrigger className={`h-8 text-xs ${isBad ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800" : ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="N">Normal</SelectItem>
                              <SelectItem value="H">High (H)</SelectItem>
                              <SelectItem value="L">Low (L)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Reference + delete */}
                        <div className="col-span-3 flex items-center gap-1 group">
                          <Input
                            value={entry.referenceRange}
                            onChange={e => updateEntry(entry.id, { referenceRange: e.target.value })}
                            placeholder="e.g. 70-100"
                            className="h-8 text-xs text-muted-foreground flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 shrink-0"
                            onClick={() => removeRow(entry.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addRow(category)}
                    className="w-full text-xs border-dashed"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Row
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Live PDF Preview */}
        <div className="h-[calc(100vh-9rem)] overflow-hidden bg-muted/40 p-3 rounded-lg shadow-inner flex justify-center items-start">
          <div className="transform origin-top scale-[0.55] md:scale-[0.6] xl:scale-[0.62] 2xl:scale-[0.75] hover:scale-[0.85] transition-transform duration-300 ease-in-out">
            <div className="shadow-2xl pointer-events-none bg-white">
              <LabReportTemplate ref={printRef} data={reportData} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
