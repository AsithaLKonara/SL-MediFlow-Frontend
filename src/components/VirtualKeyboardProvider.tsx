"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Delete, X } from "lucide-react";
import { cn } from "@/lib/utils";

type KeyboardType = "qwerty" | "numpad" | "none";

const KeyboardContext = createContext(null);

export function VirtualKeyboardProvider({ children }: { children: React.ReactNode }) {
  const [activeType, setActiveType] = useState<KeyboardType>("none");
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      // Only activate keyboard if Touch Mode is enabled
      if (!document.body.classList.contains("touch-mode")) {
        return;
      }
      
      // Ensure we only trigger on actual text/number inputs
      if (
        target instanceof HTMLInputElement &&
        ["text", "number", "email", "search", "password", "tel"].includes(target.type)
      ) {
        setActiveInput(target);
        if (target.type === "number" || target.inputMode === "numeric" || target.type === "tel") {
          setActiveType("numpad");
        } else {
          setActiveType("qwerty");
        }
      } else if (target instanceof HTMLTextAreaElement) {
        setActiveInput(target);
        setActiveType("qwerty");
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("focusin", handleFocus);
    };
  }, []);

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;

    const start = activeInput.selectionStart ?? activeInput.value.length;
    const end = activeInput.selectionEnd ?? activeInput.value.length;
    const currentValue = activeInput.value;

    let newValue = currentValue;
    let newCursorPos = start;

    if (key === "Backspace") {
      if (start === end && start > 0) {
        newValue = currentValue.substring(0, start - 1) + currentValue.substring(end);
        newCursorPos = start - 1;
      } else if (start !== end) {
        newValue = currentValue.substring(0, start) + currentValue.substring(end);
        newCursorPos = start;
      }
    } else {
      newValue = currentValue.substring(0, start) + key + currentValue.substring(end);
      newCursorPos = start + key.length;
    }

    // Set value natively and trigger React onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    
    if (nativeInputValueSetter && activeInput instanceof HTMLInputElement) {
      nativeInputValueSetter.call(activeInput, newValue);
    } else {
      activeInput.value = newValue; // Fallback for textarea
    }

    const event = new Event("input", { bubbles: true });
    activeInput.dispatchEvent(event);

    // Restore focus and cursor position
    activeInput.focus();
    activeInput.setSelectionRange(newCursorPos, newCursorPos);
  };

  const closeKeyboard = () => {
    setActiveType("none");
    setActiveInput(null);
  };

  return (
    <KeyboardContext.Provider value={null}>
      {children}
      
      {activeType !== "none" && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] virtual-keyboard-container animate-in slide-in-from-bottom-full duration-300 pointer-events-auto">
          <div className="bg-card text-card-foreground border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 sm:p-6 w-full max-w-5xl mx-auto rounded-t-xl relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute -top-12 right-4 bg-card text-card-foreground shadow-md rounded-full h-10 w-10 border border-border"
              onClick={closeKeyboard}
            >
              <X className="w-5 h-5" />
            </Button>
            
            {activeType === "qwerty" ? (
              <QWERTYKeyboard onKeyPress={handleKeyPress} />
            ) : (
              <NumpadKeyboard onKeyPress={handleKeyPress} />
            )}
          </div>
        </div>
      )}
    </KeyboardContext.Provider>
  );
}

function QWERTYKeyboard({ onKeyPress }: { onKeyPress: (k: string) => void }) {
  const [isShift, setIsShift] = useState(false);
  
  const rows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m", ",", "."],
  ];

  return (
    <div className="flex flex-col gap-2 max-w-4xl mx-auto">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5 sm:gap-2">
          {i === 2 && <div className="w-4 sm:w-8"></div>}
          {i === 3 && (
            <Button 
              variant={isShift ? "default" : "secondary"} 
              className="h-12 sm:h-14 px-3 sm:px-6 font-semibold"
              onClick={(e) => { e.preventDefault(); setIsShift(!isShift); }}
            >
              ⇧
            </Button>
          )}
          
          {row.map(key => (
            <Button
              key={key}
              variant="outline"
              className="h-12 sm:h-14 min-w-[32px] sm:min-w-[48px] text-lg font-medium flex-1 max-w-[64px]"
              onClick={(e) => { e.preventDefault(); onKeyPress(isShift ? key.toUpperCase() : key); }}
            >
              {isShift ? key.toUpperCase() : key}
            </Button>
          ))}
          
          {i === 3 && (
            <Button 
              variant="secondary" 
              className="h-12 sm:h-14 px-3 sm:px-6"
              onClick={(e) => { e.preventDefault(); onKeyPress("Backspace"); }}
            >
              <Delete className="w-5 h-5" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-1">
        <Button 
          variant="outline" 
          className="h-12 sm:h-14 w-full max-w-2xl text-lg font-medium"
          onClick={(e) => { e.preventDefault(); onKeyPress(" "); }}
        >
          Space
        </Button>
      </div>
    </div>
  );
}

function NumpadKeyboard({ onKeyPress }: { onKeyPress: (k: string) => void }) {
  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    [".", "0", "Backspace"]
  ];

  return (
    <div className="flex flex-col gap-2 sm:gap-3 max-w-xs mx-auto">
      {keys.map((row, i) => (
        <div key={i} className="flex gap-2 sm:gap-3">
          {row.map(key => (
            <Button
              key={key}
              variant={key === "Backspace" ? "secondary" : "outline"}
              className={cn("h-16 text-2xl font-semibold flex-1", key === "Backspace" && "bg-muted/50")}
              onClick={(e) => { e.preventDefault(); onKeyPress(key); }}
            >
              {key === "Backspace" ? <Delete className="w-6 h-6" /> : key}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
