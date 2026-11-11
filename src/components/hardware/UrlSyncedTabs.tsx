"use client";

import React, { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";

interface UrlSyncedTabsProps extends React.ComponentProps<typeof Tabs> {
  defaultValue: string;
}

export function UrlSyncedTabs({
  defaultValue,
  children,
  ...props
}: UrlSyncedTabsProps) {
  const [value, setValue] = useState<string>(defaultValue);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("tab");
    if (!param) return;
    const id = window.setTimeout(() => setValue(param), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Tabs
      {...props}
      value={value}
      onValueChange={(nextVal) => setValue(String(nextVal))}
    >
      {children}
    </Tabs>
  );
}

