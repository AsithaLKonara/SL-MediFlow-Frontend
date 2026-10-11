"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, FileText, FlaskConical, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PatientDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("patient_token");
    if (!token) {
      window.location.href = "/patient-portal";
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-portal/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error("Failed to load");
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("patient_token");
        window.location.href = "/patient-portal";
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">AMAZ Hospital</h1>
          <p className="text-xs text-zinc-400">Welcome, {data.fullName}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => {
          localStorage.removeItem("patient_token");
          window.location.href = "/patient-portal";
        }}>
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" /> Prescriptions
          </h2>
          {data.Prescription?.length === 0 ? (
            <p className="text-zinc-500 text-sm">No prescriptions found.</p>
          ) : (
            <div className="space-y-4">
              {data.Prescription?.map((rx: any) => (
                <Card key={rx.id} className="bg-zinc-900 border-zinc-800 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex justify-between">
                      <span>Doctor: {rx.doctorName}</span>
                      <span className="text-zinc-400 font-normal">{new Date(rx.createdAt).toLocaleDateString()}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 mt-2">
                      {rx.items?.map((item: any) => (
                        <li key={item.id} className="flex justify-between border-b border-zinc-800 pb-2">
                          <span className="font-medium text-orange-400">{item.drugName}</span>
                          <span className="text-zinc-300 text-right">{item.dosage} - {item.frequency}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-500" /> Lab Reports
          </h2>
          {data.LabRequests?.length === 0 ? (
            <p className="text-zinc-500 text-sm">No lab reports found.</p>
          ) : (
            <div className="space-y-4">
              {data.LabRequests?.map((lab: any) => {
                const reportLink = lab.reportUrl || (lab.status === "COMPLETED" ? `/reports/${lab.id.slice(0, 8).toUpperCase()}` : null);
                return (
                  <Card key={lab.id} className="bg-zinc-900 border-zinc-800 text-white shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          Status:{" "}
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${lab.status === "COMPLETED" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"}`}>
                            {lab.status}
                          </span>
                        </span>
                        <span className="text-zinc-400 font-normal text-xs">
                          {new Date(lab.requestedAt || lab.createdAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-1 mt-1">
                        {lab.items && lab.items.length > 0 ? (
                          lab.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between border-b border-zinc-800/80 py-1.5 text-xs">
                              <span className="font-medium text-zinc-200">🧪 {item.LabTest?.name || "Lab Investigation"}</span>
                              <span className="text-zinc-400">{item.LabTest?.category || "Pathology"}</span>
                            </div>
                          ))
                        ) : lab.tests ? (
                          lab.tests.map((test: any) => (
                            <div key={test.id} className="flex justify-between border-b border-zinc-800/80 py-1.5 text-xs">
                              <span className="font-medium text-zinc-200">{test.testName}</span>
                              <span className="text-zinc-400">{test.result || "Pending"}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-zinc-400">Diagnostic investigation</div>
                        )}
                      </div>

                      {lab.status === "COMPLETED" && reportLink && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 h-8 font-medium shadow"
                            onClick={() => window.open(reportLink, "_blank")}
                          >
                            <FileText className="w-3.5 h-3.5" /> View / Download Report
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
