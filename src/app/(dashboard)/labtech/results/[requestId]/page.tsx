"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Microscope, AlertTriangle, CheckCircle, Send } from "lucide-react";
import Link from "next/link";

interface TestItem {
  name: string;
  unit: string;
  referenceRange: string;
  result: string | null;
  status: string;
}

interface LabRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  doctor: string;
  clinicalIndication: string;
  tests: TestItem[];
  priority: string;
  status: string;
  requestedAt: string;
}

// Utility: check if a numeric result is outside reference range (simplified heuristic)
function isCritical(result: string, referenceRange: string): boolean {
  const numMatch = result.match(/[\d.]+/);
  const refMatch = referenceRange.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!numMatch || !refMatch) return false;
  const val = parseFloat(numMatch[0]);
  const low = parseFloat(refMatch[1]);
  const high = parseFloat(refMatch[2]);
  return val < low || val > high;
}

export default function LabResultsPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);

  const [request, setRequest] = useState<LabRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests`)
      .then(r => r.json())
      .then((data: any[]) => {
        const req = data.find((x: any) => x.id === requestId);
        if (req) {
          const mapped: LabRequest = {
            id: req.id,
            patientId: req.patientId,
            patientName: req.Patient?.fullName || `Patient ${req.patientId.slice(0, 4)}`,
            patientAge: 30,
            doctor: req.Visit?.User?.fullName || req.doctorId || "Unknown",
            clinicalIndication: "Routine Checkup",
            tests: (req.items || []).map((item: any) => ({
              id: item.LabTest?.id,
              name: item.LabTest?.name,
              unit: item.LabTest?.unit || "",
              referenceRange: item.LabTest?.referenceRange || "",
              result: null,
              status: req.status
            })),
            priority: req.priority || "ROUTINE",
            status: req.status,
            requestedAt: req.requestedAt
          };
          setRequest(mapped);
          if (req.status === "COMPLETED") setPublished(true);
        }
        setLoading(false);
      });
  }, [requestId]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    const incomplete = request.tests.some((_, i) => !results[i]?.trim());
    if (incomplete) { toast.error("Please enter results for all tests before publishing."); return; }
    
    setSaving(true);
    
    const apiResults = request.tests.map((t, i) => {
      const val = results[i];
      return {
        biomarker: t.name,
        value: val,
        isOutOfRange: isCritical(val, t.referenceRange),
        notes: notes
      };
    });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests/${requestId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: apiResults, reportUrl: reportUrl || undefined })
      });
      if (!res.ok) throw new Error("Failed to submit results");
      
      setSaving(false);
      setPublished(true);
      toast.success(`Report for ${request.patientName} published. Results securely saved.`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to publish report");
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`);
      if (!res.ok) throw new Error("Failed to get presigned URL");
      const { uploadUrl, fileUrl } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type
        }
      });

      if (!uploadRes.ok) throw new Error("Failed to upload to S3");

      setReportUrl(fileUrl);
      toast.success("File uploaded to AWS S3 successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  if (loading || !request) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/labtech/requests">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Requests
          </Button>
        </Link>
        <div className="h-6 w-px bg-border" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#3A3435]">Enter Results — {request.patientName}</h2>
          <p className="text-muted-foreground text-sm">
            Request ID: <span className="font-mono font-medium">{request.id}</span> · Requested by {request.doctor}
          </p>
        </div>
        {request.priority === "URGENT" && (
          <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 gap-1 animate-pulse ml-2">
            <AlertTriangle className="w-3.5 h-3.5" /> URGENT
          </Badge>
        )}
        {published && (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 gap-1 ml-2">
            <CheckCircle className="w-3.5 h-3.5" /> Published
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Request Details */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Patient & Request Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Patient ID</p>
                  <p className="font-mono font-medium text-primary">{request.patientId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-medium">{request.patientAge} years</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requesting Doctor</p>
                  <p className="font-medium">{request.doctor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested At</p>
                  <p className="font-medium">{new Date(request.requestedAt).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Clinical Indication</p>
                <p className="text-sm italic text-[#3A3435]">"{request.clinicalIndication}"</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Tests Ordered ({request.tests.length})</p>
                <div className="space-y-1">
                  {request.tests.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Microscope className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{t.name}</span>
                      <span className="text-muted-foreground ml-auto">{t.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reference Ranges */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reference Ranges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {request.tests.map((t, i) => (
                  <div key={i} className="flex flex-col text-xs border-b last:border-0 pb-2 last:pb-0">
                    <span className="font-semibold text-[#3A3435]">{t.name}</span>
                    <span className="text-muted-foreground mt-0.5">{t.referenceRange}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results Entry Form */}
        <div className="xl:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Results Entry Form</CardTitle>
              <CardDescription>
                {published
                  ? "This report has been published and sent to the doctor."
                  : "Enter results for each test. Values outside the reference range will be flagged automatically."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePublish} className="space-y-6">
                {/* Test result rows */}
                <div className="space-y-4">
                  {request.tests.map((test, idx) => {
                    const currentResult = results[idx] ?? "";
                    const flagged = currentResult && isCritical(currentResult, test.referenceRange);
                    return (
                      <div key={idx} className={`rounded-lg border p-4 space-y-3 transition-colors ${flagged ? "border-red-500/20 bg-red-500/10/30" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[#3A3435]">{test.name}</p>
                            <p className="text-xs text-muted-foreground">Reference: {test.referenceRange} · Unit: {test.unit}</p>
                          </div>
                          {flagged && (
                            <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 gap-1 shrink-0">
                              <AlertTriangle className="w-3 h-3" /> Critical Value
                            </Badge>
                          )}
                          {currentResult && !flagged && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 gap-1 shrink-0">
                              <CheckCircle className="w-3 h-3" /> Normal
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            placeholder={`Enter result (${test.unit})`}
                            value={currentResult}
                            disabled={published}
                            onChange={e => setResults(prev => ({ ...prev, [idx]: e.target.value }))}
                            className={flagged ? "border-red-400 focus-visible:ring-red-400" : ""}
                          />
                          <span className="text-sm text-muted-foreground shrink-0 min-w-[40px]">{test.unit}</span>
                        </div>
                        {flagged && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                            ⚠️ Value is outside normal range. Please verify before publishing.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Lab Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Lab Technician Notes (Optional)</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-60"
                    placeholder="Any additional observations, specimen quality notes, or caveats..."
                    value={notes}
                    disabled={published}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* PDF Report Upload */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Attach PDF Report (AWS S3 Upload)</label>
                  <Input 
                    type="file"
                    accept="application/pdf,image/*"
                    disabled={published || uploadingFile}
                    onChange={handleFileUpload}
                  />
                  {uploadingFile && <p className="text-xs text-blue-500 animate-pulse">Uploading to S3...</p>}
                  {reportUrl && !uploadingFile && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      File uploaded: <a href={reportUrl} target="_blank" rel="noreferrer" className="underline break-all">{reportUrl}</a>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Select a file to securely upload it to AWS S3.</p>
                </div>

                {!published ? (
                  <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white w-full gap-2">
                    <Send className="w-4 h-4" />
                    {saving ? "Publishing Report..." : "Publish Report to Patient Record"}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-sm text-green-800 font-medium">
                      Report has been published and is now available in {request.patientName}'s medical record.
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
