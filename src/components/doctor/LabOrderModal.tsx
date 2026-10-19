"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, FlaskConical, AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface LabTestItem {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  sampleType?: string;
  room?: {
    id: string;
    roomNumber: string;
  };
}

interface LabOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTests: LabTestItem[], isUrgent: boolean) => void;
  initialSelectedTests?: LabTestItem[];
  initialIsUrgent?: boolean;
}

export function LabOrderModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedTests = [],
  initialIsUrgent = false
}: LabOrderModalProps) {
  const [catalog, setCatalog] = useState<LabTestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedMap, setSelectedMap] = useState<Record<string, LabTestItem>>({});
  const [isUrgent, setIsUrgent] = useState(initialIsUrgent);

  // Sync initial selection when opened
  useEffect(() => {
    if (isOpen) {
      const map: Record<string, LabTestItem> = {};
      initialSelectedTests.forEach(t => {
        map[t.id] = t;
      });
      setSelectedMap(map);
      setIsUrgent(initialIsUrgent);
      fetchCatalog();
    }
  }, [isOpen, initialSelectedTests, initialIsUrgent]);

  const fetchCatalog = async () => {
    try {
      setIsLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/catalog`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCatalog(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch lab catalog in LabOrderModal", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [catalog]);

  const filteredTests = useMemo(() => {
    return catalog.filter(test => {
      const matchesCategory = selectedCategory === "ALL" || test.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        test.name.toLowerCase().includes(q) || 
        (test.code && test.code.toLowerCase().includes(q)) ||
        (test.category && test.category.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  const toggleTest = (test: LabTestItem) => {
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[test.id]) {
        delete next[test.id];
      } else {
        next[test.id] = test;
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Object.values(selectedMap), isUrgent);
    onClose();
  };

  if (!isOpen) return null;

  const selectedList = Object.values(selectedMap);
  const totalCost = selectedList.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      data-testid="lab-order-modal"
    >
      <div 
        className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Order Laboratory Tests</h2>
              <p className="text-xs text-muted-foreground">Select master catalog tests for this patient visit</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            data-testid="close-lab-modal-btn"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-border space-y-3 bg-muted/10">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tests by name, code or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
              data-testid="lab-search-input"
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

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">Loading laboratory catalog...</p>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-1.5">
              <FlaskConical className="w-8 h-8 stroke-1 text-muted-foreground/50" />
              <p className="text-xs font-medium">No lab tests found</p>
              <p className="text-[11px] text-muted-foreground/80">Try adjusting your search query or category filter</p>
            </div>
          ) : (
            filteredTests.map(test => {
              const isSelected = !!selectedMap[test.id];
              return (
                <div
                  key={test.id}
                  onClick={() => toggleTest(test)}
                  data-testid={`lab-test-row-${test.id}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected 
                      ? "bg-blue-500/10 border-blue-500/30 shadow-xs" 
                      : "bg-card hover:bg-muted/40 border-border/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                      isSelected 
                        ? "bg-blue-600 border-blue-600 text-white" 
                        : "border-muted-foreground/40 bg-background"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-semibold", isSelected ? "text-blue-600 dark:text-blue-400" : "text-foreground")}>
                          {test.name}
                        </span>
                        {test.code && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-muted rounded font-mono text-muted-foreground">
                            {test.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span className="uppercase font-medium tracking-wider">{test.category}</span>
                        {test.room && <span>• Room {test.room.roomNumber}</span>}
                        {test.sampleType && <span>• {test.sampleType}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-foreground">
                      Rs. {Number(test.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={e => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded border-border text-red-600 focus:ring-red-600"
                data-testid="lab-urgent-checkbox"
              />
              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Mark as URGENT
              </span>
            </label>
            <div className="text-xs text-muted-foreground border-l border-border pl-3">
              Selected: <strong className="text-foreground">{selectedList.length}</strong> {selectedList.length === 1 ? "test" : "tests"}
              {selectedList.length > 0 && (
                <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                  (Rs. {totalCost.toLocaleString()})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              data-testid="cancel-lab-modal-btn"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="confirm-lab-modal-btn"
            >
              Confirm ({selectedList.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
