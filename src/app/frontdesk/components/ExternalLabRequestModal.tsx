import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, User, Search, Loader2 } from "lucide-react";

interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
}

interface ExternalLabRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientPhone: string;
  patientName: string;
}

export function ExternalLabRequestModal({ isOpen, onClose, patientPhone, patientName }: ExternalLabRequestModalProps) {
  const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTests();
    }
  }, [isOpen]);

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchTests = async () => {
    setIsLoadingTests(true);
    try {
      const res = await fetch(`${API}/lab/catalog`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTests(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load lab tests");
    } finally {
      setIsLoadingTests(false);
    }
  };

  const toggleTest = (id: string) => {
    const newSelected = new Set(selectedTestIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTestIds(newSelected);
  };

  const handleSubmit = async () => {
    if (!patientPhone || !patientName) {
      toast.error("Please enter patient details");
      return;
    }
    if (selectedTestIds.size === 0) {
      toast.error("Please select at least one test");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/lab/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientPhone: patientPhone,
          patientName: patientName,
          testIds: Array.from(selectedTestIds)
        })
      });

      if (res.ok) {
        toast.success("External Lab Request created successfully!");
        setSelectedTestIds(new Set());
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create lab request");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error connecting to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = Array.from(selectedTestIds).reduce((total, id) => {
    const test = availableTests.find(t => t.id === id);
    return total + (test?.price || 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle>External Lab Request</DialogTitle>
          <DialogDescription>
            Create a direct lab request for a patient without a doctor consultation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          <div className="bg-background border border-border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">Available Lab Tests</h3>
              <div className="text-xs text-muted-foreground">
                Selected: {selectedTestIds.size}
              </div>
            </div>
            
            {isLoadingTests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {availableTests.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => toggleTest(test.id)}
                    className={`flex justify-between items-center p-3 rounded-md border text-left transition-colors ${
                      selectedTestIds.has(test.id)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{test.name}</div>
                      <div className="text-xs opacity-70">{test.code}</div>
                    </div>
                    <div className="font-semibold text-sm">Rs. {test.price}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-2">
            <span className="font-medium">Total Amount:</span>
            <span className="text-xl font-bold text-primary">Rs. {totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedTestIds.size === 0 || !patientPhone || !patientName}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Request & Add Charge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
