import { useAuth } from "@/components/providers/AuthProvider";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Users } from "lucide-react";
import { toast } from "sonner";

export function ManageTokensForm({ 
  sessionId, 
  currentLimit,
  sessionName,
  onUpdateSuccess 
}: { 
  sessionId: string; 
  currentLimit: number;
  sessionName: string;
  onUpdateSuccess?: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(currentLimit >= 9999);
  const [limit, setLimit] = useState(currentLimit >= 9999 ? 40 : currentLimit);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleUpdate = async () => {
    try {
      setIsSubmitting(true);
      const finalLimit = isUnlimited ? 9999 : Number(limit);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tokenCapacity: finalLimit
        })
      });

      if (!res.ok) throw new Error("Failed to update tokens");

      toast.success("Tokens Updated", { description: `Session now accepts ${isUnlimited ? 'unlimited' : finalLimit} tokens.` });
      setOpen(false);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      toast.error("Error", { description: "Could not update token capacity." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-foreground" />}>
        <Users className="w-3 h-3 mr-1" /> Manage Tokens
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tokens</DialogTitle>
          <DialogDescription>
            Adjust the token capacity for {sessionName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Unlimited Tokens</h4>
              <p className="text-xs text-muted-foreground">Allow unlimited walk-ins for this session</p>
            </div>
            <Switch checked={isUnlimited} onCheckedChange={setIsUnlimited} disabled={isSubmitting} />
          </div>

          {!isUnlimited && (
            <div className="space-y-2">
              <label className="text-sm font-medium block">Token Limit</label>
              <Input 
                type="number"
                min={1}
                max={500}
                value={limit === undefined || limit === null ? "" : limit}
                onChange={e => setLimit(parseInt(e.target.value) || 0)}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={isSubmitting}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
