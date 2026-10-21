"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilePlus2, Search, Plus, Check, Trash2, Edit3 } from "lucide-react";

export interface ExtraServiceCatalogItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
}

export interface SelectedExtraService {
  id: string;
  title: string;
  defaultPrice: number;
  customPrice: number;
  notes?: string;
}

interface ExtraServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableServices: ExtraServiceCatalogItem[];
  selectedServices: SelectedExtraService[];
  onSave: (services: SelectedExtraService[]) => void;
}

export function ExtraServicesModal({
  isOpen,
  onClose,
  availableServices,
  selectedServices: initialSelected,
  onSave
}: ExtraServicesModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedExtraService[]>(initialSelected);

  const filteredServices = availableServices.filter(s => {
    const q = search.toLowerCase();
    const titleMatch = (s.title || "").toLowerCase().includes(q);
    const descMatch = (s.description || "").toLowerCase().includes(q);
    const catMatch = (s.category || "").toLowerCase().includes(q);
    return titleMatch || descMatch || catMatch;
  });

  const isSelected = (id: string) => selected.some(s => s.id === id);

  const toggleService = (svc: ExtraServiceCatalogItem) => {
    if (isSelected(svc.id)) {
      setSelected(selected.filter(s => s.id !== svc.id));
    } else {
      setSelected([
        ...selected,
        {
          id: svc.id,
          title: svc.title,
          defaultPrice: svc.price,
          customPrice: svc.price,
          notes: ""
        }
      ]);
    }
  };

  const updateCustomPrice = (id: string, price: number) => {
    setSelected(
      selected.map(s => (s.id === id ? { ...s, customPrice: price } : s))
    );
  };

  const updateNotes = (id: string, notes: string) => {
    setSelected(
      selected.map(s => (s.id === id ? { ...s, notes } : s))
    );
  };

  const handleConfirm = () => {
    onSave(selected);
    onClose();
  };

  const totalCost = selected.reduce((sum, s) => sum + (s.customPrice || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FilePlus2 className="w-5 h-5 text-purple-600" />
            Prescribe Extra Clinical Services & Procedures
          </DialogTitle>
          <DialogDescription>
            Select from hospital services (e.g. ECG, Dressing, Nebulization). You can customize / override prices for OPD patients.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 py-2">
          {/* Left: Available Services */}
          <div className="flex-1 flex flex-col min-h-0 border rounded-lg bg-card">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services (ECG, Dressing, Nebulization)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1.5">
                {filteredServices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No matching clinical services found.
                  </div>
                ) : (
                  filteredServices.map(svc => {
                    const active = isSelected(svc.id);
                    return (
                      <div
                        key={svc.id}
                        onClick={() => toggleService(svc)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-sm ${
                          active
                            ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500"
                            : "bg-background hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{svc.title}</span>
                          {svc.description && (
                            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {svc.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xs">Rs. {svc.price?.toFixed(2)}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-xs ${
                            active ? "bg-purple-600 text-white border-purple-600" : "border-muted-foreground/40"
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

          {/* Right: Selected Services with Price Customization */}
          <div className="w-full md:w-84 flex flex-col border rounded-lg bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-sm">Selected Services ({selected.length})</h4>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-[160px] max-h-[300px]">
              {selected.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No services selected yet. Click any service on the left to add.
                </div>
              ) : (
                <div className="space-y-3 pr-2">
                  {selected.map(svc => (
                    <div key={svc.id} className="p-3 rounded-lg bg-card border text-xs space-y-2">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="truncate pr-2">{svc.title}</span>
                        <button
                          onClick={() => toggleService({ id: svc.id, title: svc.title, price: svc.defaultPrice })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Fee (OPD):</span>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[10px]">Rs.</span>
                          <Input
                            type="number"
                            min="0"
                            value={svc.customPrice}
                            onChange={e => updateCustomPrice(svc.id, parseFloat(e.target.value) || 0)}
                            className="h-7 w-24 text-right text-xs font-bold"
                          />
                        </div>
                      </div>

                      <Input
                        placeholder="Instructions / procedure notes..."
                        value={svc.notes || ""}
                        onChange={e => updateNotes(svc.id, e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="pt-2 border-t flex justify-between items-center text-sm font-bold">
              <span>Total Services:</span>
              <span className="text-purple-600 text-base">Rs. {totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-purple-600 hover:bg-purple-700 text-white">
            Confirm Services ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
