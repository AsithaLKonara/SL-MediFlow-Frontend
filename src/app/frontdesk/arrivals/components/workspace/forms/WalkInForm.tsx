import { useAuth } from "@/components/providers/AuthProvider";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function WalkInForm({ 
  doctorId, 
  sessionId,
  onComplete,
  open: externalOpen,
  onOpenChange: setExternalOpen
}: { 
  doctorId: string; 
  sessionId?: string;
  onComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { token } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen || setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    reason: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/appointments/walk-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ doctorId, sessionId: sessionId || "", patient: formData })
      });
      
      if (!res.ok) throw new Error("API Error");
      
      toast.success("Walk-in patient registered. Assigned to next available token.");
      setOpen(false);
      setFormData({ firstName: "", lastName: "", phone: "", reason: "" });
      
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error("Failed to register walk-in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <DialogTrigger render={<Button variant="outline" className="w-full sm:w-auto gap-2 border-primary/20 hover:bg-primary/5 text-primary" />}>
          <Clock className="w-4 h-4" />
          + Walk-in Patient
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register Walk-in Patient</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName" 
                required 
                value={formData.firstName}
                onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                value={formData.lastName}
                onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input 
              id="phone" 
              required 
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit (Optional)</Label>
            <Input 
              id="reason" 
              value={formData.reason}
              onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} 
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate Token
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
