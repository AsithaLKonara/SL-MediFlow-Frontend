"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { FileText, Printer, Search, Loader2, Edit, Trash2, Calendar, Filter } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useReactToPrint } from "react-to-print";
import { PrescriptionPrintTemplate } from "@/components/printing/PrescriptionPrintTemplate";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function PrescriptionHistoryPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  const [selectedRxForPrint, setSelectedRxForPrint] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const fetchPrescriptions = async () => {
    try {
      const url = user?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/prescriptions?doctorId=${user.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/prescriptions`;
        
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPrescriptions(data);
      } else {
        console.error("API returned error or non-array:", data);
        toast.error(data.error || "Failed to load prescription history");
        setPrescriptions([]);
      }
    } catch (e) {
      console.error("Failed to load prescriptions", e);
      toast.error("Failed to load prescription history");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [user]);

  const handlePrint = useReactToPrint({
    contentRef: printRef as any,
    documentTitle: `Prescription_${selectedRxForPrint?.patientName || 'History'}`,
    onAfterPrint: () => {
      triggerPrinterAutoCut();
    }
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
    const patientParam = rx.patientId || rx.Patient?.id;
    if (!patientParam) {
      toast.error("Patient profile not linked to this prescription.");
      return;
    }
    const query = new URLSearchParams();
    query.set("editPrescriptionId", rx.id);
    if (rx.visitId) query.set("visitId", rx.visitId);
    router.push(`/doctor/consultation/${patientParam}?${query.toString()}`);
  };


  const handleDeleteClick = async (rx: any) => {
    if (rx.status === "DISPENSED") {
      toast.error("Cannot delete a prescription that has already been dispensed.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete prescription for ${rx.patientName}?`)) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${rx.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
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
      

      {/* Hidden print area */}
      <div className="hidden">
        {selectedRxForPrint && (
          <PrescriptionPrintTemplate ref={printRef} prescription={selectedRxForPrint} />
        )}
      </div>
    </div>
  );
}
