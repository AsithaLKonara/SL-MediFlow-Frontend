import { useState } from "react";
import { DoctorStatus } from "../../../page";
import { Check, Clock, User, X, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { WalkInForm } from "../forms/WalkInForm";

export function TokenBoardMatrix({ 
  doctor, 
  sessionId,
  tokens, 
  onTokenUpdate 
}: { 
  doctor: DoctorStatus; 
  sessionId?: string;
  tokens: any[]; 
  onTokenUpdate: () => void 
}) {
  const [selectedToken, setSelectedToken] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);

  const getTokenIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <Check className="w-3 h-3 text-green-600" />;
      case "WAITING": return <Clock className="w-3 h-3 text-amber-500" />;
      case "CONSULTATION": return <Play className="w-3 h-3 text-blue-600" />;
      case "CANCELLED": 
      case "NO_SHOW": return <X className="w-3 h-3 text-red-500" />;
      case "AVAILABLE": return <span className="text-muted-foreground/50">—</span>;
      default: return null;
    }
  };

  const getTokenStyle = (status: string) => {
    switch (status) {
      case "COMPLETED": return "border-green-200 bg-green-50 text-green-700 hover:border-green-300";
      case "WAITING": return "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300";
      case "CONSULTATION": return "border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-400 ring-offset-1";
      case "CANCELLED": 
      case "NO_SHOW": return "border-red-200 bg-red-50 text-red-700 opacity-70 hover:border-red-300";
      case "AVAILABLE": return "border-border bg-card text-muted-foreground hover:border-primary/50";
      default: return "";
    }
  };

  const currentlyServing = tokens.find(t => t.status === "CONSULTATION");
  const nextToken = tokens.find(t => t.status === "WAITING"); // assuming ordered chronologically

  const handleAction = async (action: string, tokenToUpdate: any) => {
    if (!tokenToUpdate) return;
    setIsUpdating(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/frontdesk/appointments/${tokenToUpdate.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: action })
      });
      if (!res.ok) throw new Error("API failed");
      
      toast.success(`Token #${tokenToUpdate.tokenNumber} marked as ${action.replace('_', ' ')}`);
      setSelectedToken(null);
      
      // We don't necessarily need to call onTokenUpdate here if the socket triggers it,
      // but calling it ensures UI updates immediately even if socket is slow.
      onTokenUpdate();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* NOW SERVING BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="text-blue-200 text-sm font-semibold tracking-widest uppercase mb-1">Now Serving</h4>
          {currentlyServing ? (
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black bg-white text-blue-900 px-4 py-1 rounded-lg">
                {String(currentlyServing.tokenNumber).padStart(2, '0')}
              </div>
              <div>
                <div className="text-xl font-bold">{currentlyServing.patient?.firstName} {currentlyServing.patient?.lastName}</div>
                <div className="text-blue-200 text-sm">{doctor.attendance?.roomNumber || "Room"}</div>
              </div>
            </div>
          ) : (
            <div className="text-xl font-medium text-blue-100">No active consultation</div>
          )}
        </div>
        
        <div className="flex gap-2">
          {currentlyServing && (
            <Button onClick={() => handleAction("COMPLETED", currentlyServing)} disabled={isUpdating} variant="secondary" className="h-12 px-6 text-base font-bold gap-2 bg-green-500 text-white hover:bg-green-600 border-none">
              Mark Complete
              <Check className="w-5 h-5" />
            </Button>
          )}
          {nextToken && !currentlyServing && (
            <Button onClick={() => handleAction("CONSULTATION", nextToken)} disabled={isUpdating} variant="secondary" className="h-12 px-6 text-base font-bold gap-2 bg-white text-blue-900 hover:bg-blue-50">
              Call Next Patient: #{String(nextToken.tokenNumber).padStart(2, '0')}
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* TOKEN MATRIX */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Token Board</h3>
          <div className="flex gap-4 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600"/> Completed</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500"/> Waiting</span>
            <span className="flex items-center gap-1"><Play className="w-3 h-3 text-blue-600"/> Consulting</span>
            <span className="flex items-center gap-1"><span className="w-3 text-center">—</span> Available</span>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
          {tokens.map((token, index) => (
            <button
              key={token.id || token.tokenNumber || `available-${index}`}
              onClick={() => {
                if (token.status === "AVAILABLE") {
                  setIsWalkInOpen(true);
                } else {
                  setSelectedToken(token);
                }
              }}
              className={`
                flex flex-col items-center justify-center p-2 rounded-lg border transition-all h-16
                ${getTokenStyle(token.status)}
                ${selectedToken?.id === token.id ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-md' : ''}
              `}
            >
              <span className="text-lg font-bold">
                {String(token.tokenNumber).padStart(2, '0')}
              </span>
              <div className="mt-1">
                {getTokenIcon(token.status)}
              </div>
            </button>
          ))}
          {tokens.length === 0 && (
            <div className="col-span-10 text-center py-12 text-muted-foreground">
              No tokens found for this session.
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedToken} onOpenChange={(open) => !open && setSelectedToken(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Token Details</DialogTitle>
          </DialogHeader>
          {selectedToken && (
            <div className="flex flex-col gap-6 pt-4">
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-lg">Token #{String(selectedToken.tokenNumber).padStart(2, '0')}</div>
                  <div className="text-muted-foreground text-sm font-medium">{selectedToken.patient?.firstName || "Patient"} {selectedToken.patient?.lastName || ""}</div>
                  {selectedToken.patient?.phone && <div className="text-muted-foreground text-xs">{selectedToken.patient.phone}</div>}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {selectedToken.status === 'WAITING' && (
                  <Button disabled={isUpdating} onClick={() => handleAction("CONSULTATION", selectedToken)} className="bg-primary text-white hover:bg-primary/90 w-full justify-start h-10 gap-2">
                    <Play className="w-4 h-4" /> Start Consultation
                  </Button>
                )}
                {selectedToken.status === 'CONSULTATION' && (
                  <Button disabled={isUpdating} onClick={() => handleAction("COMPLETED", selectedToken)} className="bg-green-600 text-white hover:bg-green-700 w-full justify-start h-10 gap-2">
                    <Check className="w-4 h-4" /> Mark Completed
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
                  <Button disabled={isUpdating || selectedToken.status === 'COMPLETED'} variant="outline" onClick={() => handleAction("NO_SHOW", selectedToken)} className="border-amber-200 text-amber-700 hover:bg-amber-50">
                    No Show
                  </Button>
                  <Button disabled={isUpdating || selectedToken.status === 'COMPLETED'} variant="outline" onClick={() => handleAction("CANCELLED", selectedToken)} className="border-red-200 text-red-700 hover:bg-red-50">
                    Cancel Token
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isWalkInOpen && (
        <WalkInForm 
          doctorId={doctor.id} 
          sessionId={sessionId}
          onComplete={onTokenUpdate} 
          open={isWalkInOpen} 
          onOpenChange={setIsWalkInOpen} 
        />
      )}
    </div>
  );
}
