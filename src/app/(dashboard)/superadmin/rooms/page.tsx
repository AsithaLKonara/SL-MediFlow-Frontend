"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DoorOpen, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Wrench } from "lucide-react";
import { io, Socket } from "socket.io-client";

export default function RoomsManagementPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{ roomNumber: string; department: string; description: string; status: string; isActive: boolean }>({
    roomNumber: "",
    department: "GENERAL",
    description: "",
    status: "AVAILABLE",
    isActive: true
  });

  const fetchRooms = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRooms(await res.json());
      }
    } catch (e) {
      toast.error("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    
    // Live Sync
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    socket.on("connect", () => {
      fetchRooms(); 
    });

    socket.on("ROOM_STATUS_UPDATED", () => {
      fetchRooms(); // Refetch on any room update
    });
    
    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${process.env.NEXT_PUBLIC_API_URL}/rooms/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/rooms`;
      
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Room ${editingId ? "updated" : "created"}`);
      setIsDialogOpen(false);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Room deleted");
      fetchRooms();
    } catch {
      toast.error("Failed to delete room");
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Available</Badge>;
      case 'OCCUPIED': return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Occupied</Badge>;
      case 'MAINTENANCE': return <Badge className="bg-yellow-100 text-yellow-800"><Wrench className="w-3 h-3 mr-1" /> Maintenance</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Room Management</h2>
          <p className="text-muted-foreground mt-1">Manage hospital physical rooms, availability, and statuses.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingId(null);
        }}>
          <DialogTrigger render={<Button type="button" onClick={() => setFormData({ roomNumber: "", department: "GENERAL", description: "", status: "AVAILABLE", isActive: true })} />}>
            <Plus className="w-4 h-4 mr-2" /> Add Room
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Room" : "Add New Room"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Room Number / Name (Must be unique)</Label>
                <Input value={formData.roomNumber} onChange={(e) => setFormData({...formData, roomNumber: e.target.value})} placeholder="e.g. 101, LAB-A" required />
              </div>
              <div className="space-y-2">
                <Label>Department Type</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v || ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General Ward</SelectItem>
                    <SelectItem value="CONSULTATION">Consultation</SelectItem>
                    <SelectItem value="LAB">Laboratory</SelectItem>
                    <SelectItem value="EXTRA_SERVICE">Extra Services</SelectItem>
                    <SelectItem value="SURGERY">Operation Theater</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v || ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch checked={formData.isActive} onCheckedChange={(c) => setFormData({...formData, isActive: c})} />
                <Label>Active (Can be assigned)</Label>
              </div>
              <Button type="submit" className="w-full">Save Room</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DoorOpen className="w-5 h-5 text-primary" /> Hospital Rooms Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground animate-pulse">Loading rooms...</TableCell></TableRow>
              ) : rooms.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No rooms found. Create one.</TableCell></TableRow>
              ) : (
                rooms.map(room => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium text-lg tracking-tight">{room.roomNumber}</TableCell>
                    <TableCell><Badge variant="outline">{room.department}</Badge></TableCell>
                    <TableCell>{getStatusBadge(room.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{room.description || "-"}</TableCell>
                    <TableCell>
                      {room.isActive ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setFormData({
                          roomNumber: room.roomNumber,
                          department: room.department,
                          description: room.description || "",
                          status: room.status,
                          isActive: room.isActive
                        });
                        setEditingId(room.id);
                        setIsDialogOpen(true);
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
