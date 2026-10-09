"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FilePlus2, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/AuthProvider";

interface ExtraService {
  id: string;
  title: string;
  description: string | null;
  price: number;
  barcode: string;
  roomNumber?: string;
  isActive: boolean;
}

export default function ExtraServicesPage() {
  const [services, setServices] = useState<ExtraService[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New service state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newService, setNewService] = useState({ title: "", description: "", price: 0, barcode: "", roomNumber: "" });
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = () => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then((data: any) => {
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          console.error("Failed to load extra services:", data);
          toast.error(data.message || "Failed to load extra services");
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load extra services");
        setLoading(false);
      });
  };

  const openNewServiceModal = () => {
    // Generate 10-digit barcode
    const barcode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setNewService({ title: "", description: "", price: 0, barcode, roomNumber: "" });
    setIsNewOpen(true);
  };

  const handleCreateService = async () => {
    if (!newService.title || newService.price < 0 || !newService.barcode) {
      return toast.error("Please fill all required fields correctly.");
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newService)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to create");
      
      toast.success("Extra service created successfully!");
      setIsNewOpen(false);
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this service?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Service deactivated");
      fetchServices();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading && services.length === 0) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Extra Services</h2>
          <p className="text-muted-foreground mt-1">Manage addons, medical certificates, admission fees, etc.</p>
        </div>
        
        <Button onClick={openNewServiceModal} className="bg-primary hover:bg-primary/90 text-white shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Add Extra Service
        </Button>
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Extra Service</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Service Title*</Label>
                <Input value={newService.title} onChange={e => setNewService({...newService, title: e.target.value})} placeholder="e.g. Admission Fee" />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} placeholder="Optional details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Default Price (LKR)*</Label>
                  <Input type="number" value={newService.price} onChange={e => setNewService({...newService, price: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <Label>Barcode (10-digit)*</Label>
                  <Input value={newService.barcode} onChange={e => setNewService({...newService, barcode: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Room Number</Label>
                <Input value={newService.roomNumber} onChange={e => setNewService({...newService, roomNumber: e.target.value})} placeholder="e.g. Room 12" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateService} isLoading={saving}>Create Service</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services Catalog</CardTitle>
          <CardDescription>All billing items not classified as drugs or lab tests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Service</TableHead>
                  <TableHead className="font-semibold">Barcode</TableHead>
                  <TableHead className="font-semibold">Room</TableHead>
                  <TableHead className="font-semibold text-right">Price</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((svc) => (
                  <TableRow key={svc.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{svc.title}</div>
                      {svc.description && <div className="text-xs text-muted-foreground mt-0.5">{svc.description}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{svc.barcode}</TableCell>
                    <TableCell>{svc.roomNumber || "-"}</TableCell>
                    <TableCell className="text-right font-medium">Rs. {svc.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(svc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {services.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No extra services found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
