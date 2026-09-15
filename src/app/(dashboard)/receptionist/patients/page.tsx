"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Patient {
  id: string;
  name: string;
  age: number;
  contact: string;
  registeredAt: string;
}

let nextPatientNum = 6;
function generatePatientId() {
  return `AMZ-P-${String(nextPatientNum++).padStart(6, "0")}`;
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Registration Form state (Only 3 fields as per UX rules)
  const [form, setForm] = useState({ name: "", age: "", contact: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // We mock the API call, mapping old data to new schema
    fetch("/api/receptionist/patients")
      .then((r) => r.json())
      .then((data) => {
        // Mock data mapping
        const mapped = data.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          age: 45, // default mock
          contact: p.contact,
          registeredAt: p.registeredAt
        }));
        setPatients(mapped);
        setLoading(false);
      });
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.contact) {
      toast.error("Please fill in all 3 fields.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const newPatient: Patient = {
        id: generatePatientId(),
        name: form.name,
        age: parseInt(form.age, 10),
        contact: form.contact,
        registeredAt: new Date().toISOString(),
      };
      setPatients((prev) => [newPatient, ...prev]);
      setForm({ name: "", age: "", contact: "" });
      setShowForm(false);
      setSubmitting(false);
      toast.success("Patient registered successfully.");
      
      // Navigate straight to Create Visit with this patient
      router.push(`/receptionist/queue?patientId=${newPatient.id}`);
    }, 600);
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.contact.includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Search Patient</h2>
          <p className="text-muted-foreground mt-1">Find an existing patient or register a new one to start a visit.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary text-white hidden sm:flex">
          <Plus className="w-4 h-4 mr-2" /> New Patient
        </Button>
      </div>

      {/* Patient Search Card */}
      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="pt-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Name / Phone / Patient No."
              className="pl-10 h-12 text-lg border-primary/30 focus-visible:ring-primary shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {search.length > 0 ? (
            <div className="space-y-3">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors bg-muted/30">
                    <div>
                      <h3 className="font-bold text-lg text-[#3A3435]">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {p.age} years • {p.contact} • <span className="font-mono">{p.id}</span>
                      </p>
                    </div>
                    <Button 
                      onClick={() => router.push(`/receptionist/queue?patientId=${p.id}`)}
                      className="bg-primary text-white"
                    >
                      Select Patient
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Patient not found?</p>
                  <Button onClick={() => setShowForm(true)} variant="outline" className="border-primary/50 text-primary">
                    <Plus className="w-4 h-4 mr-2" /> Register New Patient
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-slate-200" />
              <p className="mb-6">Type to search the hospital database</p>
              <Button onClick={() => setShowForm(true)} variant="outline" className="border-primary/50 text-primary">
                <Plus className="w-4 h-4 mr-2" /> Register New Patient
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline Registration Form (New Patient) */}
      {showForm && (
        <Card className="shadow-sm border-primary/20 bg-muted/30 border-2">
          <CardHeader className="pb-4">
            <CardTitle>Register Patient</CardTitle>
            <CardDescription>Minimal required fields to create a hospital record.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  autoFocus
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Age</label>
                <Input
                  type="number"
                  placeholder="Years"
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  placeholder="Mobile number"
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                />
              </div>
              <div className="md:col-span-3 flex items-center justify-end gap-3 mt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white">
                  {submitting ? "Saving..." : "Create Patient & Proceed"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
