"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, Activity, Check, Loader2, Stethoscope, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ExtraServiceItem {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  customPrice?: number;
  barcode?: string;
  roomId?: string | null;
  room?: {
    id: string;
    roomNumber: string;
    department?: string;
  } | null;
}

interface ExtraServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedServices: ExtraServiceItem[]) => void;
  initialSelectedServices?: ExtraServiceItem[];
}

export function ExtraServiceOrderModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedServices = []
}: ExtraServiceOrderModalProps) {
  const [services, setServices] = useState<ExtraServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMap, setSelectedMap] = useState<Record<string, ExtraServiceItem>>({});

  useEffect(() => {
    if (isOpen) {
      const map: Record<string, ExtraServiceItem> = {};
      initialSelectedServices.forEach(s => {
        map[s.id] = s;
      });
      setSelectedMap(map);
      fetchServices();
    }
  }, [isOpen, initialSelectedServices]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extra-services`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setServices(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch extra services in ExtraServiceOrderModal", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const allServices = useMemo(() => {
    const list = [...services];
    if (!list.some(s => s.title.toLowerCase().includes("medical leave"))) {
      list.push({
        id: "cert-leave-default",
        title: "Medical Leave Certificate",
        description: "Official sickness leave recommendation with diagnosis & resume date",
        price: 650,
        room: { id: "ext-cert", roomNumber: "EXT-01", department: "EXTRA_SERVICE" }
      });
    }
    if (!list.some(s => s.title.toLowerCase().includes("general fitness"))) {
      list.push({
        id: "cert-fitness-default",
        title: "General Fitness Certificate",
        description: "Pre-employment or school fitness clearance with vitals & vision",
        price: 1200,
        room: { id: "ext-cert", roomNumber: "EXT-01", department: "EXTRA_SERVICE" }
      });
    }
    return list;
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allServices;
    return allServices.filter(svc => 
      svc.title.toLowerCase().includes(q) ||
      (svc.description && svc.description.toLowerCase().includes(q)) ||
      (svc.room?.roomNumber && svc.room.roomNumber.toLowerCase().includes(q))
    );
  }, [allServices, searchQuery]);

  const toggleService = (svc: ExtraServiceItem) => {
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[svc.id]) {
        delete next[svc.id];
      } else {
        next[svc.id] = {
          ...svc,
          customPrice: svc.customPrice ?? svc.price
        };
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Object.values(selectedMap));
    onClose();
  };

  if (!isOpen) return null;

  const selectedList = Object.values(selectedMap);
  const totalCost = selectedList.reduce((sum, s) => sum + (Number(s.customPrice ?? s.price) || 0), 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      data-testid="extra-service-order-modal"
    >
      <div 
        className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Order Extra Services / Procedures</h2>
              <p className="text-xs text-muted-foreground">Select procedures, nursing care, or diagnostic tests (e.g. ECG, Nebulization, Dressing)</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            data-testid="close-extra-service-modal-btn"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border bg-muted/10">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search services (e.g. ECG, Dressing, Injection, Nebulization)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
              data-testid="extra-service-search-input"
              autoFocus
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
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs">Loading extra services...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-1.5">
              <Stethoscope className="w-8 h-8 stroke-1 text-muted-foreground/50" />
              <p className="text-xs font-medium">No services found</p>
              <p className="text-[11px] text-muted-foreground/80">Try searching for a different procedure title</p>
            </div>
          ) : (
            filteredServices.map(svc => {
              const isSelected = !!selectedMap[svc.id];
              return (
                <div
                  key={svc.id}
                  onClick={() => toggleService(svc)}
                  data-testid={`extra-service-row-${svc.id}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected 
                      ? "bg-emerald-500/10 border-emerald-500/30 shadow-xs" 
                      : "bg-card hover:bg-muted/40 border-border/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                      isSelected 
                        ? "bg-emerald-600 border-emerald-600 text-white" 
                        : "border-muted-foreground/40 bg-background"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-semibold", isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-foreground")}>
                          {svc.title}
                        </span>
                        {svc.room && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded font-medium">
                            Room {svc.room.roomNumber}
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {svc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-foreground">
                      Rs. {Number(svc.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Selected: <strong className="text-foreground">{selectedList.length}</strong> {selectedList.length === 1 ? "service" : "services"}
            {selectedList.length > 0 && (
              <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                (Rs. {totalCost.toLocaleString()})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              data-testid="cancel-extra-service-modal-btn"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="confirm-extra-service-modal-btn"
            >
              Confirm ({selectedList.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
