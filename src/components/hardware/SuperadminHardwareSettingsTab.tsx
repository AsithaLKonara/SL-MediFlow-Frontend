"use client";

import React, { useState, useEffect } from "react";
import { Save, Globe, RefreshCw, Tv } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPoleDisplayPanel } from "./CustomerPoleDisplayPanel";
import { hardwareService } from "@/services/hardware.service";
import {
  DEFAULT_BRIDGE_URL,
  PoleDisplayConfig,
  poleDisplayService,
} from "@/services/pole-display.service";

export function SuperadminHardwareSettingsTab() {
  const { token } = useAuth();
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const [poleConfig, setPoleConfig] = useState<PoleDisplayConfig>(() =>
    hardwareService.getPoleDisplayConfig()
  );
  const [bridgeReachable, setBridgeReachable] = useState<boolean | null>(null);
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setBridgeUrl(hardwareService.getBridgeUrl());
      }
    });
    if (!token) {
      return () => {
        cancelled = true;
      };
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.success && json.data) {
          if (json.data.hardware_bridge_url) {
            setBridgeUrl(json.data.hardware_bridge_url);
          }
          if (json.data.pole_display_config) {
            try {
              const parsed = JSON.parse(json.data.pole_display_config);
              const updated = hardwareService.savePoleDisplayConfig(parsed);
              setPoleConfig(updated);
            } catch {
              // Keep local config if stored JSON is invalid
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [token]);

  const checkBridgeConnection = async (urlToTest?: string) => {
    const cleanUrl = (urlToTest || bridgeUrl || DEFAULT_BRIDGE_URL).trim().replace(/\/+$/, "");
    setCheckingBridge(true);
    try {
      const res = await fetch(`${cleanUrl}/printers`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        setBridgeReachable(true);
        toast.success("Local Print & Pole Display Bridge is online.");
      } else {
        setBridgeReachable(false);
        toast.error(`Bridge responded with HTTP ${res.status}`);
      }
    } catch {
      setBridgeReachable(false);
      toast.error("Hardware Bridge unreachable. Ensure node-print daemon is running.");
    } finally {
      setCheckingBridge(false);
    }
  };

  const handleSaveSystemDefaults = async () => {
    if (!token) {
      toast.error("Authentication required to save system defaults.");
      return;
    }

    const cleanUrl = (bridgeUrl || DEFAULT_BRIDGE_URL).trim().replace(/\/+$/, "");
    setSavingDefaults(true);
    try {
      // Save immediately for current browser workstation
      if (typeof window !== "undefined") {
        localStorage.setItem("node_print_url", cleanUrl);
      }
      hardwareService.setBridgeUrl(cleanUrl);
      const savedLocal = poleDisplayService.saveConfig(poleConfig);

      // Persist hospital-wide defaults to backend SystemSetting table
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hardware_bridge_url: cleanUrl,
          pole_display_config: JSON.stringify(savedLocal),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save hardware defaults");
      }

      toast.success("System-wide Customer & Pole Display defaults saved.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save system hardware defaults.";
      toast.error(msg);
    } finally {
      setSavingDefaults(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-primary" />
            Hospital Print &amp; Display Bridge Defaults
          </CardTitle>
          <CardDescription>
            Configure the default node-print Bridge endpoint and pole display profile distributed to Frontdesk terminals. Individual counters can override these in Frontdesk Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-bridge-url">Default Hardware Bridge URL</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="admin-bridge-url"
                value={bridgeUrl}
                onChange={(e) => {
                  setBridgeUrl(e.target.value);
                  hardwareService.setBridgeUrl(e.target.value);
                }}
                placeholder="http://127.0.0.1:18181"
                className="font-mono max-w-md"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => checkBridgeConnection()}
                disabled={checkingBridge}
                className="gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${checkingBridge ? "animate-spin" : ""}`} />
                Test Bridge
              </Button>
              {bridgeReachable !== null && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                    bridgeReachable
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  }`}
                >
                  {bridgeReachable ? "Bridge Online" : "Bridge Offline"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Standard loopback bridge: <code>http://127.0.0.1:18181</code> (or central print server LAN IP).
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/20 flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5" />
            <span>Saves Bridge URL &amp; current Pole Display profile globally for SL MediFlow terminals.</span>
          </div>
          <Button
            type="button"
            onClick={handleSaveSystemDefaults}
            disabled={savingDefaults}
            className="gap-2 shrink-0"
          >
            <Save className="w-4 h-4" />
            {savingDefaults ? "Saving..." : "Save System Defaults"}
          </Button>
        </CardFooter>
      </Card>

      <CustomerPoleDisplayPanel
        bridgeUrl={bridgeUrl}
        onConfigChange={setPoleConfig}
        showPatientQueueLauncher
      />
    </div>
  );
}

