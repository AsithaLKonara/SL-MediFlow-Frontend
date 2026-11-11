"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type SidebarContextType = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isTouchMode: boolean;
  toggleTouchMode: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isTouchMode, setIsTouchMode] = useState(false);
  
  useEffect(() => {
    const storedSidebar = localStorage.getItem("mediflow_sidebar_collapsed") || localStorage.getItem("amaz_sidebar_collapsed");
    if (storedSidebar) {
      setIsCollapsed(JSON.parse(storedSidebar));
    }
    
    const storedTouch = localStorage.getItem("mediflow_touch_mode") || localStorage.getItem("amaz_touch_mode");
    if (storedTouch) {
      setIsTouchMode(JSON.parse(storedTouch));
    }
  }, []);

  useEffect(() => {
    if (isTouchMode) {
      document.body.classList.add("touch-mode");
    } else {
      document.body.classList.remove("touch-mode");
    }
  }, [isTouchMode]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("mediflow_sidebar_collapsed", JSON.stringify(next));
      return next;
    });
  };

  const toggleTouchMode = () => {
    setIsTouchMode(prev => {
      const next = !prev;
      localStorage.setItem("mediflow_touch_mode", JSON.stringify(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, isTouchMode, toggleTouchMode }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
};
