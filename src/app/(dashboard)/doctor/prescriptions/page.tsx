"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { FileText, Printer, Search, Loader2, Edit, Trash2, Calendar, Filter } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useReactToPrint } from "react-to-print";
import { PrescriptionPrintTemplate } from "@/components/printing/PrescriptionPrintTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PrescriptionHistoryPage() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  const [selectedRxForPrint, setSelectedRxForPrint] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<any | null>(null);
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
  const initialDrugState = { drugName: "", dosage: "", timesPerDay: "", tabletsPerTime: "", duration: "", instructions: "" };
  const [editDrugs, setEditDrugs] = useState<typeof initialDrugState[]>([]);
  const [currentEditDrug, setCurrentEditDrug] = useState(initialDrugState);
  
  const [isSaving, setIsSaving] = useState(false);


  const fetchPrescriptions = async () => {
    try {
      const url = user?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/prescriptions?doctorId=${user.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/prescriptions`;
        
      const res = await fetch(url);
      const data = await res.json();
      setPrescriptions(data);
    } catch (e) {
      console.error("Failed to load prescriptions", e);
      toast.error("Failed to load prescription history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [user]);

  const handlePrint = useReactToPrint({
    contentRef: printRef as any,
    documentTitle: `Prescription_${selectedRxForPrint?.patientName || 'History'}`
  });

  const handlePrintClick = (rx: any) => {
    setSelectedRxForPrint(rx);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };


  const handleEditClick = (rx: any) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot edit a prescription that has already been dispensed.");
      return;
    }
    setEditingRx(rx);
    setEditDiagnosis(rx.diagnosis || "");
    setEditNotes(rx.clinicalNotes || "");
    
    // Parse existing items back into editDrugs state
    const parsedDrugs = (rx.items || []).map((item: any) => {
      // Very basic reverse-parsing for frequency. In a real app, storing structured data is better.
      const freq = item.frequency || "";
      let tabletsPerTime = "";
      let timesPerDay = "";
      
      if (freq.includes("x day")) {
         const match = freq.match(/^(\d+)x day(?: \((.*?)\s*tab\))?/);
         if (match) {
           timesPerDay = match[1] || "";
           tabletsPerTime = match[2] || "";
         } else {
           timesPerDay = freq;
         }
      } else if (freq.includes("tablets") && freq.includes("times a day")) {
         // Fallback for my previously created format
         const parts = freq.split("tablets,");
         tabletsPerTime = parts[0]?.trim() || "";
         timesPerDay = parts[1]?.split("times a day")[0]?.trim() || "";
      } else {
         timesPerDay = freq; // Fallback
      }
      
      return {
        drugName: item.drugName || "",
        dosage: item.dosage || "",
        timesPerDay,
        tabletsPerTime,
        duration: item.duration || "",
        instructions: item.instructions || ""
      };
    });
    setEditDrugs(parsedDrugs);
    setCurrentEditDrug(initialDrugState);
    
    setIsEditModalOpen(true);
  };
  
  const handleAddEditDrug = () => {
    if (!currentEditDrug.drugName) {
      toast.error("Please enter a medicine name");
      return;
    }
    setEditDrugs([...editDrugs, currentEditDrug]);
    setCurrentEditDrug(initialDrugState);
  };
  
  const handleRemoveEditDrug = (index: number) => {
    setEditDrugs(editDrugs.filter((_, i) => i !== index));
  };

  const handleEditExistingDrug = (index: number) => {
    const drugToEdit = editDrugs[index];
    setCurrentEditDrug(drugToEdit);
    setEditDrugs(editDrugs.filter((_, i) => i !== index));
  };


  const handleSaveEdit = async () => {
    if (!editingRx) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${editingRx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: editDiagnosis,
          clinicalNotes: editNotes,
          items: editDrugs.map(d => ({
            drugName: d.drugName,
            dosage: d.dosage,
            frequency: d.timesPerDay ? `${d.timesPerDay}x day ${d.tabletsPerTime ? `(${d.tabletsPerTime} tab)` : ''}`.trim() : "",
            duration: d.duration,
            instructions: d.instructions
          }))
        })
      });
      
      if (res.ok) {
        const updatedRx = await res.json();
        toast.success("Prescription updated successfully");
        setPrescriptions(prev => prev.map(p => p.id === editingRx.id ? updatedRx : p));
        setIsEditModalOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update prescription");
      }
    } catch (e) {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };


  const handleDeleteClick = async (rx: any) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot delete a prescription that has already been dispensed.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete prescription for ${rx.patientName}?`)) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${rx.id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          toast.success("Prescription deleted successfully");
          setPrescriptions(prev => prev.filter(p => p.id !== rx.id));
        } else {
          const data = await res.json();
          toast.error(data.error || "Failed to delete prescription");
        }
      } catch (e) {
        toast.error("An error occurred while deleting");
      }
    }
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesSearch = rx.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rx.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter) {
      const rxDate = new Date(rx.createdAt).toISOString().split('T')[0];
      matchesDate = rxDate === dateFilter;
    }

    let matchesStatus = true;
    if (statusFilter !== "ALL") {
      matchesStatus = rx.status === statusFilter;
    }

    return matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Prescription History
          </h1>
          <p className="text-muted-foreground mt-1">
            View, filter, and manage all prescriptions you have issued.
          </p>
        </div>
      </div>

      <div className="bg-card text-card-foreground border rounded-lg shadow-sm">
        {/* Filters Section */}
        <div className="p-4 border-b flex flex-col md:flex-row items-center gap-4 bg-muted/20">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search patient, diagnosis, or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-4">
            <div className="relative flex-1 md:w-48">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full pl-9 pr-3 items-center justify-between rounded-md border border-input bg-background py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DISPENSED">Dispensed</option>
              </select>
            </div>
            
            {(dateFilter || statusFilter !== "ALL") && (
              <Button variant="ghost" onClick={() => { setDateFilter(""); setStatusFilter("ALL"); }} className="px-2 text-muted-foreground hover:text-foreground shrink-0">
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Medicines</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right sticky right-0 bg-muted/50 border-l z-10 w-[180px] shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No prescriptions found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrescriptions.map((rx) => (
                    <TableRow key={rx.id} className="hover:bg-muted/50 group">
                      <TableCell className="font-medium">
                        {new Date(rx.createdAt).toLocaleDateString()}
                        <div className="text-xs text-muted-foreground">
                          {new Date(rx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{rx.patientName || "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {rx.diagnosis || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5 border-primary/20">
                          {rx.items?.length || 0} items
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rx.status === "DISPENSED" ? "default" : "secondary"}>
                          {rx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right sticky right-0 bg-background group-hover:bg-muted/50 border-l z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] p-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="Reprint"
                            onClick={() => handlePrintClick(rx)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="Edit"
                            onClick={() => handleEditClick(rx)}
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="Delete"
                            onClick={() => handleDeleteClick(rx)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      

      {/* Edit Prescription Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Prescription</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2">
              <Label htmlFor="diagnosis">Diagnosis / Assessment</Label>
              <Input
                id="diagnosis"
                value={editDiagnosis}
                onChange={(e) => setEditDiagnosis(e.target.value)}
                placeholder="Enter diagnosis..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <textarea
                id="notes"
                value={editNotes}
                onChange={(e: any) => setEditNotes(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add any specific clinical notes or advice..."
                rows={2}
              ></textarea>
            </div>
            
            <div className="pt-4 border-t mt-2">
              <Label className="text-base font-semibold mb-3 block">Medicines</Label>
              
              <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Medicine Name" value={currentEditDrug.drugName} onChange={e => setCurrentEditDrug({...currentEditDrug, drugName: e.target.value})} />
                  <Input placeholder="Dosage (e.g. 500mg)" value={currentEditDrug.dosage} onChange={e => setCurrentEditDrug({...currentEditDrug, dosage: e.target.value})} />
                  <Input placeholder="Times per day" type="number" min="1" value={currentEditDrug.timesPerDay} onChange={e => setCurrentEditDrug({...currentEditDrug, timesPerDay: e.target.value})} />
                  <Input placeholder="Tablets per time" type="number" min="1" value={currentEditDrug.tabletsPerTime} onChange={e => setCurrentEditDrug({...currentEditDrug, tabletsPerTime: e.target.value})} />
                  <Input placeholder="Duration (e.g. 5 days)" value={currentEditDrug.duration} onChange={e => setCurrentEditDrug({...currentEditDrug, duration: e.target.value})} />
                  <Input placeholder="Instructions (e.g. After meals)" value={currentEditDrug.instructions} onChange={e => setCurrentEditDrug({...currentEditDrug, instructions: e.target.value})} />
                </div>
                <Button type="button" variant="secondary" className="w-full" onClick={handleAddEditDrug}>
                  Add Medicine
                </Button>
              </div>
              
              {editDrugs.length > 0 && (
                <div className="mt-4 border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Freq / Dur</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editDrugs.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{d.drugName}</TableCell>
                          <TableCell>{d.dosage}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.tabletsPerTime && d.timesPerDay ? `${d.tabletsPerTime} tabs, ${d.timesPerDay}x/day` : d.timesPerDay}
                            <br/>{d.duration}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 mr-1" onClick={() => handleEditExistingDrug(i)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveEditDrug(i)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden print area */}
      <div className="hidden">
        {selectedRxForPrint && (
          <PrescriptionPrintTemplate ref={printRef} prescription={selectedRxForPrint} />
        )}
      </div>
    </div>
  );
}
