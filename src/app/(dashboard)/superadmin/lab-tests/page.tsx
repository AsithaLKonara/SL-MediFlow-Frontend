"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TestTube, ArrowRight, MoreVertical, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
  sampleType: string;
  roomNumber?: string;
  isActive: boolean;
}

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LabTestTemplatesPage() {
  const pathname = usePathname();
  const { token } = useAuth();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New test state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTest, setNewTest] = useState({ name: "", code: "", price: 0, category: "Biochemistry", sampleType: "Blood", roomNumber: "" });
  const [saving, setSaving] = useState(false);

  // Edit test state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);

  // Delete test state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTest, setDeletingTest] = useState<LabTest | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = () => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || data.message || "Failed to load lab templates");
        return data;
      })
      .then((data: any) => {
        if (Array.isArray(data)) {
          setTests(data);
        } else {
          setTests([]);
          toast.error("Invalid data format received from server");
        }
        setLoading(false);
      })
      .catch((e: any) => {
        toast.error(e.message || "Failed to load lab templates");
        setTests([]);
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
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTest)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to create");
      
      toast.success("Lab test template created successfully!");
      setIsNewOpen(false);
      setNewTest({ name: "", code: "", price: 0, category: "Biochemistry", sampleType: "Blood", roomNumber: "" });
      fetchTests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingTest) return;
    if (!editingTest.name || !editingTest.code || editingTest.price < 0) {
      return toast.error("Please fill all required fields correctly.");
    }
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/tests/${editingTest.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingTest.name,
          code: editingTest.code,
          price: editingTest.price,
          category: editingTest.category,
          sampleType: editingTest.sampleType,
          roomNumber: editingTest.roomNumber
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Lab test updated successfully!");
      setIsEditOpen(false);
      fetchTests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTest) return;
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/tests/${deletingTest.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Lab test deleted successfully!");
      setIsDeleteOpen(false);
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
              <div className="grid gap-2">
                <Label>Room Number</Label>
                <Input value={newTest.roomNumber} onChange={e => setNewTest({...newTest, roomNumber: e.target.value})} placeholder="e.g. LAB-01" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTest} isLoading={saving}>Create Test</Button>
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
                <TableHead>Room</TableHead>
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
                  <TableCell>{test.roomNumber || "-"}</TableCell>
                  <TableCell className="text-right font-medium">Rs. {test.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <Link href={`${pathname}/${test.id}`}>
                          <DropdownMenuItem className="cursor-pointer font-medium text-primary">
                            <TestTube className="w-4 h-4 mr-2" /> Manage Biomarkers
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditingTest(test); setIsEditOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => { setDeletingTest(test); setIsDeleteOpen(true); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Test
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {tests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No lab tests found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Test Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Lab Test</DialogTitle>
          </DialogHeader>
          {editingTest && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Test Name</Label>
                <Input value={editingTest.name} onChange={e => setEditingTest({...editingTest, name: e.target.value})} placeholder="e.g. Complete Blood Count" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Code</Label>
                  <Input value={editingTest.code} onChange={e => setEditingTest({...editingTest, code: e.target.value})} placeholder="e.g. CBC-01" />
                </div>
                <div className="grid gap-2">
                  <Label>Price (Rs.)</Label>
                  <Input type="number" value={editingTest.price} onChange={e => setEditingTest({...editingTest, price: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={editingTest.category || ""} onValueChange={(val) => setEditingTest({...editingTest, category: val || ""})}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                      <SelectItem value="Hematology">Hematology</SelectItem>
                      <SelectItem value="Microbiology">Microbiology</SelectItem>
                      <SelectItem value="Immunology">Immunology</SelectItem>
                      <SelectItem value="Pathology">Pathology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sample Type</Label>
                  <Select value={editingTest.sampleType || ""} onValueChange={(val) => setEditingTest({...editingTest, sampleType: val || ""})}>
                    <SelectTrigger><SelectValue placeholder="Sample Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blood">Blood</SelectItem>
                      <SelectItem value="Urine">Urine</SelectItem>
                      <SelectItem value="Stool">Stool</SelectItem>
                      <SelectItem value="Swab">Swab</SelectItem>
                      <SelectItem value="Tissue">Tissue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Room Number</Label>
                <Input value={editingTest.roomNumber || ""} onChange={e => setEditingTest({...editingTest, roomNumber: e.target.value})} placeholder="e.g. LAB-01" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} isLoading={saving}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <div className="py-4 text-sm text-muted-foreground">
              This will permanently delete the lab test "{deletingTest?.name}" ({deletingTest?.code}) from the catalog. 
              This action cannot be undone.
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} isLoading={saving} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
