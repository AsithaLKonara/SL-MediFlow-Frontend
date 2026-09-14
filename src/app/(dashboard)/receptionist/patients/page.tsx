"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
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
  dob: string;
  contact: string;
  gender: string;
  registeredAt: string;
  status: string;
}

// Simulate next patient ID counter
let nextPatientNum = 6;

function generatePatientId() {
  const num = String(nextPatientNum++).padStart(3, "0");
  return `PAT-2026-${num}`;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    dob: "",
    contact: "",
    gender: "MALE",
    emergency: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/receptionist/patients")
      .then((r) => r.json())
      .then((data) => {
        setPatients(data.data);
        setLoading(false);
      });
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.dob || !form.contact) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const newPatient: Patient = {
        id: generatePatientId(),
        name: form.name,
        dob: form.dob,
        contact: form.contact,
        gender: form.gender,
        registeredAt: new Date().toISOString(),
        status: "ACTIVE",
      };
      setPatients((prev) => [newPatient, ...prev]);
      setForm({ name: "", dob: "", contact: "", gender: "MALE", emergency: "" });
      setShowForm(false);
      setSubmitting(false);
      toast.success(`Patient ${newPatient.name} registered. ID: ${newPatient.id}`);
    }, 800);
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Patient Registration</h2>
          <p className="text-muted-foreground mt-1">Register new patients and manage the hospital directory.</p>
        </div>
        <Button
          onClick={() => setShowForm((s) => !s)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Register New Patient
        </Button>
      </div>

      {/* Inline registration form */}
      {showForm && (
        <Card className="shadow-sm border-primary/20 bg-[#F2ECEB]/40">
          <CardHeader className="pb-4">
            <CardTitle>New Patient Registration</CardTitle>
            <CardDescription>Fill in the patient details below. A unique Patient ID will be generated automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  placeholder="e.g. Mrs. Amara Perera"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date of Birth *</label>
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Contact Number *</label>
                <Input
                  placeholder="+94771234567"
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Gender</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Emergency Contact</label>
                <Input
                  placeholder="+94779876543"
                  value={form.emergency}
                  onChange={(e) => setForm((f) => ({ ...f, emergency: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white">
                  {submitting ? "Registering..." : "Register & Generate ID"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Patient Directory */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Patient Directory</CardTitle>
          <CardDescription>All registered patients with their unique hospital IDs.</CardDescription>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or patient ID..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-semibold text-primary">{p.id}</TableCell>
                        <TableCell className="font-medium text-[#3A3435]">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.gender}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(p.dob).toLocaleDateString()}</TableCell>
                        <TableCell className="text-muted-foreground">{p.contact}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(p.registeredAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No patients found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
