"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { FlaskConical, Search, Plus, Check, Trash2, AlertCircle } from "lucide-react";

export interface LabTestItem {
  id: string;
  name: string;
  code?: string;
  category?: string;
  price: number;
}

interface LabTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTests: LabTestItem[];
  selectedTests: LabTestItem[];
  onSave: (tests: LabTestItem[], isUrgent: boolean, notes: string) => void;
  initialUrgent?: boolean;
  initialNotes?: string;
}

export function LabTestsModal({
  isOpen,
  onClose,
  availableTests,
  selectedTests: initialSelectedTests,
  onSave,
  initialUrgent = false,
  initialNotes = ""
}: LabTestsModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LabTestItem[]>(initialSelectedTests);
  const [isUrgent, setIsUrgent] = useState(initialUrgent);
  const [notes, setNotes] = useState(initialNotes);

  const filteredTests = availableTests.filter(t => {
    const q = search.toLowerCase();
    const nameMatch = (t.name || "").toLowerCase().includes(q);
    const codeMatch = (t.code || "").toLowerCase().includes(q);
    const catMatch = (t.category || "").toLowerCase().includes(q);
    return nameMatch || codeMatch || catMatch;
  });

  const isSelected = (id: string) => selected.some(t => t.id === id);

  const toggleTest = (test: LabTestItem) => {
    if (isSelected(test.id)) {
      setSelected(selected.filter(t => t.id !== test.id));
    } else {
      setSelected([...selected, test]);
    }
  };

  const handleConfirm = () => {
    onSave(selected, isUrgent, notes);
    onClose();
  };

  const totalCost = selected.reduce((sum, t) => sum + (t.price || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Order Laboratory Investigations
          </DialogTitle>
          <DialogDescription>
            Search and select tests from hospital catalog. Forwarded to the Laboratory upon consultation completion.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 py-2">
          {/* Left Panel: Catalog List */}
          <div className="flex-1 flex flex-col min-h-0 border rounded-lg bg-card">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search lab tests by name or code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1.5">
                {filteredTests.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No matching laboratory tests found.
                  </div>
                ) : (
                  filteredTests.map(test => {
                    const active = isSelected(test.id);
                    return (
                      <div
                        key={test.id}
                        onClick={() => toggleTest(test)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-sm ${
                          active
                            ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500"
                            : "bg-background hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{test.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {test.code && <span className="font-mono">#{test.code}</span>}
                            {test.category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{test.category}</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xs">Rs. {test.price?.toFixed(2)}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-xs ${
                            active ? "bg-blue-600 text-white border-blue-600" : "border-muted-foreground/40"
                          }`}>
                            {active ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Selected Tests & Priority */}
          <div className="w-full md:w-80 flex flex-col border rounded-lg bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-sm">Selected Tests ({selected.length})</h4>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-[140px] max-h-[220px]">
              {selected.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No tests selected yet. Click any test on the left to add.
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {selected.map(test => (
                    <div key={test.id} className="flex items-center justify-between p-2 rounded-md bg-card border text-xs">
                      <div className="truncate pr-2 font-medium">{test.name}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold">Rs. {test.price?.toFixed(2)}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleTest(test);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Priority: Urgent</span>
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Clinical Notes for Lab
                </label>
                <Textarea
                  placeholder="e.g. Fasting sample required, check for anemia..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-between items-center text-sm font-bold pt-1 border-t">
                <span>Estimated Total:</span>
                <span className="text-primary text-base">Rs. {totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
            Confirm Lab Orders ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
