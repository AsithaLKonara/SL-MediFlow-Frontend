"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FilePlus2, Trash2, Edit, Search, X, RotateCcw, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/AuthProvider";

interface ExtraService {
  id: string;
  title: string;
  description: string | null;
  price: number;
  barcode: string;
  roomId?: string | null;
  roomNumber?: string;
  room?: {
    id: string;
    roomNumber: string;
    department: string;
  } | null;
  isActive: boolean;
}

export default function ExtraServicesPage() {
  const [services, setServices] = useState<ExtraService[]>([]);
  const [rooms, setRooms] = useState<{id: string, name: string, department: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  
  // New service state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newService, setNewService] = useState({ title: "", description: "", price: 0, barcode: "", roomId: "" });
  const [saving, setSaving] = useState(false);

  // Edit service state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<{
    id: string;
    title: string;
    description: string;
    price: number;
    barcode: string;
    roomId: string;
    isActive: boolean;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchServices();
      fetchRooms();
    }
  }, [token]);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setRooms(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchServices = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services?all=true`, {
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
    setNewService({ title: "", description: "", price: 0, barcode, roomId: "" });
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

  const openEditServiceModal = (svc: ExtraService) => {
    setEditingService({
      id: svc.id,
      title: svc.title,
      description: svc.description || "",
      price: svc.price,
      barcode: svc.barcode,
      roomId: svc.roomId || svc.room?.id || "",
      isActive: svc.isActive !== false,
    });
    setIsEditOpen(true);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    if (!editingService.title.trim() || editingService.price < 0 || !editingService.barcode) {
      return toast.error("Please fill all required fields correctly.");
    }
    
    setEditSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/${editingService.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editingService.title,
          description: editingService.description,
          price: editingService.price,
          barcode: editingService.barcode,
          roomId: editingService.roomId || null,
          isActive: editingService.isActive,
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to update service");
      
      toast.success("Extra service updated successfully!");
      setIsEditOpen(false);
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setEditSaving(false);
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

  const handleReactivate = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: true })
      });
      if (!res.ok) throw new Error("Failed to reactivate");
      toast.success("Service reactivated successfully!");
      fetchServices();
    } catch (e: any) {
      toast.error(e.message || "Failed to reactivate service");
    }
  };
  const filteredServices = useMemo(() => {
    return services.filter(svc => {
      const q = searchQuery.toLowerCase().trim();
      const roomName = svc.room?.roomNumber?.toLowerCase() || 
        (rooms.find(r => r.id === svc.roomId)?.name.toLowerCase()) || "";
      
      const matchesSearch = !q ||
        svc.title.toLowerCase().includes(q) ||
        (svc.description && svc.description.toLowerCase().includes(q)) ||
        svc.barcode.includes(q) ||
        roomName.includes(q);

      const svcRoomId = svc.roomId || svc.room?.id;
      const matchesRoom = selectedRoom === "ALL" ||
        (selectedRoom === "UNASSIGNED" ? !svcRoomId : svcRoomId === selectedRoom);

      const matchesStatus = filterStatus === "ALL" ||
        (filterStatus === "ACTIVE" ? svc.isActive !== false : svc.isActive === false);

      return matchesSearch && matchesRoom && matchesStatus;
    });
  }, [services, searchQuery, selectedRoom, filterStatus, rooms]);

  const hasActiveFilters = searchQuery !== "" || selectedRoom !== "ALL" || filterStatus !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedRoom("ALL");
    setFilterStatus("ALL");
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
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Extra Services</h2>
          <p className="text-muted-foreground mt-1">Manage addons, medical certificates, admission fees, etc.</p>
        </div>
        
        <Button onClick={openNewServiceModal} className="bg-primary hover:bg-primary/90 text-white shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Add Extra Service
        </Button>

        {/* Create Dialog */}
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
                <Label>Room</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newService.roomId} 
                  onChange={e => setNewService({...newService, roomId: e.target.value})}
                >
                  <option value="">No Room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.department})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateService} isLoading={saving}>Create Service</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Extra Service</DialogTitle>
            </DialogHeader>
            {editingService && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Service Title*</Label>
                  <Input 
                    value={editingService.title} 
                    onChange={e => setEditingService({...editingService, title: e.target.value})} 
                    placeholder="e.g. Admission Fee" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={editingService.description} 
                    onChange={e => setEditingService({...editingService, description: e.target.value})} 
                    placeholder="Optional details..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Default Price (LKR)*</Label>
                    <Input 
                      type="number" 
                      value={editingService.price} 
                      onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Barcode (10-digit)*</Label>
                    <Input 
                      value={editingService.barcode} 
                      onChange={e => setEditingService({...editingService, barcode: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Room</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingService.roomId} 
                    onChange={e => setEditingService({...editingService, roomId: e.target.value})}
                  >
                    <option value="">No Room</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.department})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Active Status</Label>
                    <p className="text-xs text-muted-foreground">Enabled for billing and counter selection</p>
                  </div>
                  <Switch 
                    checked={editingService.isActive} 
                    onCheckedChange={(checked) => setEditingService({...editingService, isActive: checked})} 
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateService} isLoading={editSaving}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Services Catalog</CardTitle>
              <CardDescription>All billing items not classified as drugs or lab tests.</CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit text-xs font-medium">
              Showing {filteredServices.length} of {services.length} services
            </Badge>
          </div>

          {/* SEARCH & FILTER CONTROLS BAR */}
          <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by service name, barcode, description, room..."
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

            {/* Room Filter */}
            <div className="w-full md:w-56">
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedRoom} 
                onChange={e => setSelectedRoom(e.target.value)}
              >
                <option value="ALL">All Rooms</option>
                <option value="UNASSIGNED">Unassigned (No Room)</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.department})</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-36">
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Deactivated</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Service</TableHead>
                  <TableHead className="font-semibold">Barcode</TableHead>
                  <TableHead className="font-semibold">Room</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Price</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((svc) => (
                  <TableRow key={svc.id} className={svc.isActive === false ? "opacity-60 bg-muted/20" : ""}>
                    <TableCell>
                      <div className="font-medium text-foreground">{svc.title}</div>
                      {svc.description && <div className="text-xs text-muted-foreground mt-0.5">{svc.description}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{svc.barcode}</TableCell>
                    <TableCell>
                      {svc.room?.roomNumber 
                        ? `${svc.room.roomNumber} (${svc.room.department})`
                        : (rooms.find(r => r.id === svc.roomId)?.name || svc.roomNumber || "-")}
                    </TableCell>
                    <TableCell>
                      {svc.isActive !== false ? (
                        <Badge variant="outline" className="border-green-500/30 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">Rs. {svc.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50" 
                          onClick={() => openEditServiceModal(svc)}
                          title="Edit Service"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {svc.isActive !== false ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                            onClick={() => handleDelete(svc.id)}
                            title="Deactivate Service"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/50" 
                            onClick={() => handleReactivate(svc.id)}
                            title="Reactivate Service"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredServices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      {services.length === 0 ? (
                        "No extra services found. Click 'Add Extra Service' to create one."
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p>No extra services match your search and filter criteria.</p>
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
    </div>
  );
}
