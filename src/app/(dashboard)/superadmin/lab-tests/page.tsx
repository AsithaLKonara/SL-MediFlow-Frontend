"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TestTube, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
  sampleType: string;
  isActive: boolean;
}

import { usePathname } from "next/navigation";

export default function LabTestTemplatesPage() {
  const pathname = usePathname();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New test state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTest, setNewTest] = useState({ name: "", code: "", price: 0, category: "Biochemistry", sampleType: "Blood" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = () => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`)
      .then(r => r.json())
      .then((data: any[]) => {
        setTests(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load lab templates");
        setLoading(false);
      });
  };

  const handleCreateTest = async () => {
    if (!newTest.name || !newTest.code || newTest.price < 0) {
      return toast.error("Please fill all required fields correctly.");
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTest)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to create");
      
      toast.success("Lab test template created successfully!");
      setIsNewOpen(false);
      setNewTest({ name: "", code: "", price: 0, category: "Biochemistry", sampleType: "Blood" });
      fetchTests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && tests.length === 0) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Lab Test Templates</h2>
          <p className="text-muted-foreground mt-1">Manage lab test profiles, categories, and reference ranges.</p>
        </div>
        
        <Button onClick={() => setIsNewOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Lab Test
        </Button>
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lab Test</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Test Name</Label>
                <Input value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} placeholder="e.g. Complete Blood Count (CBC)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Test Code</Label>
                  <Input value={newTest.code} onChange={e => setNewTest({...newTest, code: e.target.value})} placeholder="e.g. CBC01" />
                </div>
                <div className="grid gap-2">
                  <Label>Price (LKR)</Label>
                  <Input type="number" value={newTest.price} onChange={e => setNewTest({...newTest, price: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={newTest.category} onValueChange={v => v && setNewTest({...newTest, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Haematology">Haematology</SelectItem>
                      <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                      <SelectItem value="Immunology">Immunology</SelectItem>
                      <SelectItem value="Clinical Pathology">Clinical Pathology</SelectItem>
                      <SelectItem value="Microbiology">Microbiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sample Type</Label>
                  <Input value={newTest.sampleType} onChange={e => setNewTest({...newTest, sampleType: e.target.value})} placeholder="e.g. EDTA Blood, Serum" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTest} disabled={saving}>{saving ? "Saving..." : "Create Test"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Master Catalog</CardTitle>
          <CardDescription>All laboratory tests available in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sample Type</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map(test => (
                <TableRow key={test.id}>
                  <TableCell className="font-mono font-medium">{test.code}</TableCell>
                  <TableCell className="font-semibold text-primary flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    {test.name}
                  </TableCell>
                  <TableCell>{test.category}</TableCell>
                  <TableCell>{test.sampleType}</TableCell>
                  <TableCell className="text-right font-medium">Rs. {test.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`${pathname}/${test.id}`}>
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                        Manage Rows <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {tests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No lab tests found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
