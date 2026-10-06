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
              {data.LabRequests?.map((lab: any) => (
                <Card key={lab.id} className="bg-zinc-900 border-zinc-800 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex justify-between">
                      <span>Status: <span className={lab.status === "COMPLETED" ? "text-green-400" : "text-yellow-400"}>{lab.status}</span></span>
                      <span className="text-zinc-400 font-normal">{new Date(lab.createdAt).toLocaleDateString()}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 mt-2">
                      {lab.tests?.map((test: any) => (
                        <li key={test.id} className="flex justify-between border-b border-zinc-800 pb-2">
                          <span className="font-medium">{test.testName}</span>
                          <span className="text-zinc-400">{test.result || "Pending"}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
