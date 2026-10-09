"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

const MEMORY_KEY = "lab_test_memory";

export interface TestMemoryEntry {
  name: string;
  unit: string;
  referenceRange: string;
}

export function getTestMemory(): TestMemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveToTestMemory(entry: TestMemoryEntry) {
  if (!entry.name.trim() || !entry.referenceRange.trim()) return;
  const existing = getTestMemory();
  const idx = existing.findIndex(e => e.name.toLowerCase() === entry.name.toLowerCase());
  if (idx >= 0) {
    existing[idx] = entry; // Update
  } else {
    existing.push(entry);
  }
  localStorage.setItem(MEMORY_KEY, JSON.stringify(existing));
}

interface TestNameInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (entry: TestMemoryEntry) => void;
  onBlur?: () => void;
  className?: string;
}

export function TestNameInput({ value, onChange, onSelect, onBlur, className }: TestNameInputProps) {
  const [suggestions, setSuggestions] = useState<TestMemoryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadSuggestions = (query: string) => {
    const memory = getTestMemory();
    if (!query.trim()) {
      setSuggestions(memory.slice(0, 8));
      return;
    }
    const filtered = memory.filter(e =>
      e.name.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
  };

  const handleChange = (val: string) => {
    onChange(val);
    loadSuggestions(val);
    setOpen(true);
    setHighlighted(0);
  };

  const handleFocus = () => {
    loadSuggestions(value);
    setOpen(true);
  };

  const handleSelect = (entry: TestMemoryEntry) => {
    onSelect(entry);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && suggestions[highlighted]) {
      e.preventDefault();
      handleSelect(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    // Small delay so click on suggestion registers before blur closes it
    setTimeout(() => {
      setOpen(false);
      onBlur?.();
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`h-8 text-xs font-medium ${className || ""}`}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {suggestions.map((entry, idx) => (
            <button
              key={entry.name}
              type="button"
              onMouseDown={() => handleSelect(entry)}
              className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors ${
                idx === highlighted
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <span className="font-medium truncate">{entry.name}</span>
              <span className="text-[10px] opacity-60 shrink-0 ml-2">{entry.referenceRange} {entry.unit}</span>
            </button>
          ))}
        </div>
      )}
      {open && suggestions.length === 0 && value.trim() && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-lg px-3 py-2 text-xs text-muted-foreground">
          No saved tests match. This will be saved after you fill in the reference range.
        </div>
      )}
    </div>
  );
}
