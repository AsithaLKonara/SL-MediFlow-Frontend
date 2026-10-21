"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Save, FlaskConical } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface Biomarker {
  name: string;
  category: string;
  unit: string;
  referenceRange: string;
  orderIndex: number;
}

interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
}

export default function LabCatalogManager() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load catalog");
        return r.json();
      })
      .then(d => { setTests(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [token]);

  const getAuthToken = () => token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  const loadBiomarkers = async (test: LabTest) => {
    setSelectedTest(test);
    try {
      const activeToken = getAuthToken();
      if (!activeToken) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/tests/${test.id}/biomarkers`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      const rows = data.success && Array.isArray(data.data) 
        ? data.data 
        : (Array.isArray(data) ? data : []);
      setBiomarkers(rows);
    } catch (error) {
      toast.error("Failed to load template");
    }
  };

  const handleAddRow = () => {
    setBiomarkers([...biomarkers, { name: "", category: "NONE", unit: "", referenceRange: "", orderIndex: biomarkers.length + 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...biomarkers];
    updated.splice(index, 1);
    setBiomarkers(updated);
  };

  const handleChange = (index: number, field: keyof Biomarker, value: string | number) => {
    const updated = [...biomarkers];
    updated[index] = { ...updated[index], [field]: value };
    setBiomarkers(updated);
  };

  const handleSave = async () => {
    if (!selectedTest) return;
    setSaving(true);
    try {
      const activeToken = getAuthToken();
      if (!activeToken) return;

      const cleanBiomarkers = biomarkers
        .filter(b => b.name && b.name.trim() !== "")
        .map((b, idx) => ({
          name: b.name.trim(),
          category: b.category && b.category !== "NONE" && b.category.trim() !== "" ? b.category.trim() : null,
          unit: b.unit?.trim() || null,
          referenceRange: b.referenceRange?.trim() || null,
          orderIndex: typeof b.orderIndex === "number" ? b.orderIndex : idx + 1
        }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/tests/${selectedTest.id}/biomarkers`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}` 
        },
        body: JSON.stringify({ biomarkers: cleanBiomarkers })
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Template saved successfully");
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading catalog...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Lab Catalog & Templates</h2>
        <p className="text-muted-foreground mt-2">Design result entry forms and biomarkers for each lab test.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Test List */}
        <Card className="md:col-span-1 shadow-sm h-[75vh] overflow-auto">
          <CardHeader>
            <CardTitle>Available Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tests.map(test => (
              <button
                key={test.id}
                onClick={() => loadBiomarkers(test)}
                className={`w-full text-left p-3 rounded-md text-sm transition-colors flex items-center gap-2 border ${
                  selectedTest?.id === test.id ? "bg-red-50 border-red-200 text-red-900 font-semibold" : "hover:bg-gray-50 border-transparent"
                }`}
              >
                <FlaskConical className={`w-4 h-4 ${selectedTest?.id === test.id ? "text-red-600" : "text-muted-foreground"}`} />
                {test.name}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right: Template Builder */}
        <Card className="md:col-span-2 shadow-sm h-[75vh] overflow-auto">
          <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b pb-4">
            <div>
              <CardTitle>{selectedTest ? `Template: ${selectedTest.name}` : "Select a test to design its template"}</CardTitle>
              <CardDescription>Define the biomarkers, units, and reference ranges.</CardDescription>
            </div>
            {selectedTest && (
              <Button onClick={handleSave} isLoading={saving} loadingText="Save Template" className="bg-red-600 hover:bg-red-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {!selectedTest ? (
              <div className="text-center text-muted-foreground py-12">
                Select a test from the left to start building its result template.
              </div>
            ) : (
              <div className="space-y-4">
                {biomarkers.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    No template defined. This test will use a single generic result field unless you add biomarkers below.
                  </p>
                )}
                
                {biomarkers.map((bm, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50/50 relative group">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Biomarker Name</label>
                        <Input value={bm.name} onChange={e => handleChange(idx, "name", e.target.value)} placeholder="e.g. WHITE CELL COUNT" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Category (Grouping)</label>
                        <Input value={bm.category} onChange={e => handleChange(idx, "category", e.target.value)} placeholder="e.g. DIFFERENTIAL COUNT" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Unit</label>
                        <Input value={bm.unit} onChange={e => handleChange(idx, "unit", e.target.value)} placeholder="e.g. 10^9/L" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Reference Range</label>
                        <Input value={bm.referenceRange} onChange={e => handleChange(idx, "referenceRange", e.target.value)} placeholder="e.g. 4.0 - 11.0" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Button variant="outline" onClick={handleAddRow} className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-2" /> Add Biomarker Field
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
