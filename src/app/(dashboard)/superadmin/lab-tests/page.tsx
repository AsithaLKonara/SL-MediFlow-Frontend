"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TestTube, ArrowRight, MoreVertical, Edit, Trash2, Search, X, Filter, Building2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
  sampleType: string;
  roomId?: string;
  roomNumber?: string;
  room?: {
    id: string;
    roomNumber: string;
    department: string;
  };
  isActive: boolean;
}

export default function LabTestTemplatesPage() {
  const pathname = usePathname();
  const { token } = useAuth();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [rooms, setRooms] = useState<{id: string, name: string, roomNumber?: string, department: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  
  // New test state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTest, setNewTest] = useState({ name: "", code: "", price: 0, category: "Biochemistry", sampleType: "Blood", roomId: "" });
  const [saving, setSaving] = useState(false);

  // Edit test state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);

  // Delete test state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTest, setDeletingTest] = useState<LabTest | null>(null);

  const getAuthToken = () => token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  useEffect(() => {
    fetchTests();
    fetchRooms();
  }, [token]);

  const fetchRooms = async () => {
    try {
      const activeToken = getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rooms`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (res.ok) setRooms(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTests = () => {
    setLoading(true);
    const activeToken = getAuthToken();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
      headers: { Authorization: `Bearer ${activeToken}` }
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

  // Helper to resolve room display name
  const getRoomName = (test: LabTest) => {
    if (test.room?.roomNumber) {
      return `${test.room.roomNumber} (${test.room.department || "LAB"})`;
    }
    if (test.roomNumber) return test.roomNumber;
    if (!test.roomId) return "-";
    const found = rooms.find(r => r.id === test.roomId);
    if (found) return `${found.name || found.roomNumber} (${found.department})`;
    return "-";
  };

  // Extract categories dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    tests.forEach(t => { if (t.category) set.add(t.category); });
    ["Haematology", "Biochemistry", "Immunology", "Clinical Pathology", "Microbiology"].forEach(c => set.add(c));
    return Array.from(set).sort();
  }, [tests]);

  // Filtered test catalog
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        test.name?.toLowerCase().includes(q) ||
        test.code?.toLowerCase().includes(q) ||
        (test.sampleType && test.sampleType.toLowerCase().includes(q)) ||
        (test.category && test.category.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === "ALL" ||
        (test.category && test.category.toLowerCase() === selectedCategory.toLowerCase());

      const testRoomId = test.room?.id || test.roomId;
      const matchesRoom = selectedRoom === "ALL" ||
        (selectedRoom === "UNASSIGNED"
          ? !testRoomId
          : testRoomId === selectedRoom);

      return matchesSearch && matchesCategory && matchesRoom;
    });
  }, [tests, searchQuery, selectedCategory, selectedRoom]);

  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "ALL" || selectedRoom !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedRoom("ALL");
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
      setNewTest({ name: "", code: "", price: 0, category: "Biochemistry", sampleType: "Blood", roomId: "" });
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
          roomId: editingTest.roomId
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
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Lab Test Templates</h2>
          <p className="text-muted-foreground mt-1">Manage lab test profiles, categories, assigned rooms, and reference ranges.</p>
        </div>
        
        <Button onClick={() => setIsNewOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Lab Test
        </Button>
      </div>

      {/* CREATE NEW TEST MODAL */}
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
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newTest.category}
                  onChange={e => setNewTest({ ...newTest, category: e.target.value })}
                >
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Haematology">Haematology</option>
                  <option value="Immunology">Immunology</option>
                  <option value="Clinical Pathology">Clinical Pathology</option>
                  <option value="Microbiology">Microbiology</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Sample Type</Label>
                <Input value={newTest.sampleType} onChange={e => setNewTest({...newTest, sampleType: e.target.value})} placeholder="e.g. EDTA Blood, Serum" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Laboratory Room</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newTest.roomId || ""}
                onChange={e => setNewTest({ ...newTest, roomId: e.target.value })}
              >
                <option value="">No Room Assigned</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name || r.roomNumber} ({r.department})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTest} disabled={saving}>Create Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Master Catalog</CardTitle>
              <CardDescription>
                All laboratory tests available in the hospital system.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit text-xs font-medium">
              Showing {filteredTests.length} of {tests.length} templates
            </Badge>
          </div>

          {/* SEARCH & FILTER CONTROLS BAR */}
          <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by test name, code, sample type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-56">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Room Filter */}
            <div className="w-full md:w-56">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
              >
                <option value="ALL">All Rooms</option>
                <option value="UNASSIGNED">Unassigned Rooms</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name || r.roomNumber} ({r.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sample Type</TableHead>
                  <TableHead>Laboratory Room</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map(test => (
                  <TableRow key={test.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono font-medium">{test.code}</TableCell>
                    <TableCell className="font-semibold text-primary flex items-center gap-2">
                      <TestTube className="w-4 h-4 shrink-0" />
                      {test.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs bg-muted/60">
                        {test.category || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{test.sampleType || "-"}</TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {getRoomName(test)}
                    </TableCell>
                    <TableCell className="text-right font-medium">Rs. {test.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted outline-none ml-auto">
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
                {filteredTests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {tests.length === 0 ? (
                        "No lab tests found. Create one to get started."
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p>No lab tests match your search and filter criteria.</p>
                          <Button variant="outline" size="sm" onClick={resetFilters}>
                            Clear Filters
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* EDIT TEST DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Lab Test Details</DialogTitle>
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
                  <Input type="number" value={editingTest.price} onChange={e => setEditingTest({...editingTest, price: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingTest.category || "Biochemistry"}
                    onChange={e => setEditingTest({ ...editingTest, category: e.target.value })}
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Haematology">Haematology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Clinical Pathology">Clinical Pathology</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Sample Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingTest.sampleType || "Blood"}
                    onChange={e => setEditingTest({ ...editingTest, sampleType: e.target.value })}
                  >
                    <option value="Blood">Blood</option>
                    <option value="Serum">Serum</option>
                    <option value="Plasma">Plasma</option>
                    <option value="Urine">Urine</option>
                    <option value="Stool">Stool</option>
                    <option value="Swab">Swab</option>
                    <option value="Tissue">Tissue</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Laboratory Room</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingTest.roomId || ""}
                  onChange={e => setEditingTest({ ...editingTest, roomId: e.target.value })}
                >
                  <option value="">No Room Assigned</option>
                  {/* If editingTest has an associated room that is not in the rooms list yet */}
                  {editingTest.roomId && editingTest.room && !rooms.some(r => r.id === editingTest.roomId) && (
                    <option value={editingTest.roomId}>
                      {editingTest.room.roomNumber} ({editingTest.room.department || "LAB"})
                    </option>
                  )}
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.roomNumber} ({r.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
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
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
