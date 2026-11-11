"use client";

import React, { useState, useEffect } from "react";
import {
  Tv,
  Monitor,
  Terminal,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHardware } from "@/hooks/useHardware";
import {
  PoleDisplayConfig,
  PoleDisplayMode,
  PoleDisplayProtocol,
  PriceDisplayIndicator,
  poleDisplayService,
} from "@/services/pole-display.service";
import { hardwareService } from "@/services/hardware.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CustomerPoleDisplayPanelProps {
  bridgeUrl?: string;
  onConfigChange?: (config: PoleDisplayConfig) => void;
  onLoadSystemDefaults?: () => Promise<PoleDisplayConfig | null>;
  enableSystemDefaults?: boolean;
  showPatientQueueLauncher?: boolean;
}

const DISPLAY_MODES: Array<{ id: PoleDisplayMode; label: string; hint: string }> = [
  { id: "BOTH", label: "Both (Pole + Screen)", hint: "Physical VFD/LED + 2nd Monitor" },
  { id: "VFD_2X20", label: "2x20 VFD / LED Pole", hint: "Serial / USB Pole only" },
  { id: "DUAL_SCREEN", label: "Dual Screen Only", hint: "HDMI/VGA Customer Monitor" },
  { id: "DISABLED", label: "Disabled", hint: "Bypass hardware displays" },
];

const BAUD_RATES = [2400, 4800, 9600, 19200, 38400, 115200];

const PROTOCOLS: Array<{ value: PoleDisplayProtocol; label: string }> = [
  { value: "PRICE_DISPLAY", label: "Price Display (ESC Q A) - LED8 / Single-line" },
  { value: "CD5220", label: "CD5220 (Posiflex & Generic 2x20)" },
  { value: "ESCPOS", label: "ESC/POS (Epson DM-D 2x20)" },
  { value: "UTC", label: "UTC Standard / Enhanced" },
  { value: "AEDEX", label: "AEDEX Standard" },
];

const NUMERIC_TESTS: Array<{ label: string; indicator: PriceDisplayIndicator }> = [
  { label: "Price (ESC s 1)", indicator: "PRICE" },
  { label: "Total (ESC s 2)", indicator: "TOTAL" },
  { label: "Collect (ESC s 3)", indicator: "COLLECT" },
  { label: "Change (ESC s 4)", indicator: "CHANGE" },
];

export function CustomerPoleDisplayPanel({
  bridgeUrl,
  onConfigChange,
  onLoadSystemDefaults,
  enableSystemDefaults = false,
  showPatientQueueLauncher = false,
}: CustomerPoleDisplayPanelProps) {
  const { token } = useAuth();
  const {
    bridgeStatus,
    refreshBridge,
    launchCustomerDisplay,
    poleConfig,
    updatePoleConfig,
    reloadPoleConfig,
    isPoleSerialConnected,
    connectPoleSerial,
    disconnectPoleSerial,
    availablePorts,
    refreshSerialPorts,
    testPoleScreen,
    sendPolePrice,
    sendDiagnosticTest,
    clearPole,
    isWebSerialSupported,
  } = useHardware();

  const [poleTestLoading, setPoleTestLoading] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [customTestAmount, setCustomTestAmount] = useState("2750.00");
  const [showPortHelp, setShowPortHelp] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    refreshSerialPorts();
  }, [refreshSerialPorts]);

  useEffect(() => {
    if (bridgeUrl && bridgeUrl.trim()) {
      hardwareService.setBridgeUrl(bridgeUrl.trim());
    }
  }, [bridgeUrl]);

  const applyConfigUpdate = (patch: Partial<PoleDisplayConfig>) => {
    const updated = updatePoleConfig(patch);
    onConfigChange?.(updated);
  };

  const runPoleAction = async (
    action: () => Promise<boolean>,
    successMsg: string,
    failureMsg: string
  ) => {
    setPoleTestLoading(true);
    setFeedback(null);
    try {
      const ok = await action();
      setFeedback({ ok, text: ok ? successMsg : failureMsg });
      if (ok) {
        toast.success(successMsg);
      } else {
        toast.error(failureMsg);
      }
    } finally {
      setPoleTestLoading(false);
    }
  };

  const handleProtocolChange = (newProto: PoleDisplayProtocol) => {
    const updates: Partial<PoleDisplayConfig> = { protocol: newProto };
    if (newProto === "PRICE_DISPLAY" && poleConfig.baudRate !== 2400) {
      updates.baudRate = 2400;
    }
    applyConfigUpdate(updates);
  };

  const handleLoadDefaults = async () => {
    setLoadingDefaults(true);
    try {
      let loaded: PoleDisplayConfig | null = null;
      if (onLoadSystemDefaults) {
        loaded = await onLoadSystemDefaults();
      } else if (enableSystemDefaults && token) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = res.ok ? await res.json() : null;
        if (json?.success && json.data) {
          loaded = hardwareService.applySystemDefaults(json.data, { force: true });
        }
      }

      if (loaded) {
        const synced = reloadPoleConfig();
        onConfigChange?.(synced);
        setFeedback({ ok: true, text: "Loaded hospital default display configuration." });
        toast.success("Loaded hospital default display configuration.");
      } else {
        toast.info("No saved hospital display defaults found in System Settings.");
      }
    } catch {
      toast.error("Failed to fetch hospital defaults.");
    } finally {
      setLoadingDefaults(false);
    }
  };

  const previewLines = poleDisplayService.formatIdle(
    poleConfig.storeName || "SL MediFlow",
    poleConfig.welcomeMessage || "WELCOME! THANK YOU"
  );

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Tv className="w-5 h-5 text-primary" />
              Customer Display & Pole Display Suite
            </CardTitle>
            <CardDescription className="mt-1">
              Configure 2x20 VFD/LCD or LED8 Price Displays (Bridge + WebSerial) and Dual-Screen Customer Monitors.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`font-mono text-[11px] ${
                bridgeStatus.online
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              Bridge: {bridgeStatus.checking ? "Checking..." : bridgeStatus.online ? `Online (${bridgeStatus.latencyMs}ms)` : "Offline"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refreshBridge}
              title="Refresh Hardware Bridge Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bridgeStatus.checking ? "animate-spin" : ""}`} />
            </Button>
            {(onLoadSystemDefaults || enableSystemDefaults) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadDefaults}
                disabled={loadingDefaults}
                className="h-7 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {loadingDefaults ? "Loading..." : "Load System Defaults"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              feedback.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            {feedback.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Display Output Mode Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Display Output Mode
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {DISPLAY_MODES.map((m) => {
              const active = poleConfig.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => applyConfigUpdate({ mode: m.id, enabled: m.id !== "DISABLED" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/30 shadow-sm"
                      : "bg-muted/30 border-border text-foreground hover:bg-muted/60"
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{m.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Physical Pole Display Configuration */}
        {(poleConfig.mode === "VFD_2X20" || poleConfig.mode === "BOTH") && (
          <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">
                  Pole Display Configuration (Serial / USB-COM)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={poleConfig.transport === "BRIDGE" ? "default" : "outline"}
                  onClick={() => applyConfigUpdate({ transport: "BRIDGE" })}
                  className="h-7 px-2.5 text-xs font-mono"
                >
                  Local Bridge
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={poleConfig.transport === "WEBSERIAL" ? "default" : "outline"}
                  onClick={() => applyConfigUpdate({ transport: "WEBSERIAL" })}
                  className="h-7 px-2.5 text-xs font-mono"
                >
                  WebSerial
                </Button>
              </div>
            </div>

            {/* COM Port, Baud Rate, Command Protocol */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pole-com-port" className="text-xs">
                    COM Port
                  </Label>
                  <button
                    type="button"
                    onClick={refreshSerialPorts}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    title="Scan serial ports via Bridge"
                  >
                    <RefreshCw className="w-3 h-3" /> Scan
                  </button>
                </div>
                <select
                  id="pole-com-port"
                  value={poleConfig.port}
                  onChange={(e) => applyConfigUpdate({ port: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Array.from(new Set([...availablePorts, poleConfig.port])).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pole-baud-rate" className="text-xs">
                  Baud Rate
                </Label>
                <select
                  id="pole-baud-rate"
                  value={poleConfig.baudRate}
                  onChange={(e) => applyConfigUpdate({ baudRate: parseInt(e.target.value, 10) })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {BAUD_RATES.map((b) => (
                    <option key={b} value={b}>
                      {b} bps
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pole-protocol" className="text-xs">
                  Command Protocol
                </Label>
                <select
                  id="pole-protocol"
                  value={poleConfig.protocol}
                  onChange={(e) => handleProtocolChange(e.target.value as PoleDisplayProtocol)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PROTOCOLS.map((proto) => (
                    <option key={proto.value} value={proto.value}>
                      {proto.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Idle Branding & Revert Timing + Live VFD Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="pole-store-name" className="text-xs">
                  Idle Header (20 chars)
                </Label>
                <Input
                  id="pole-store-name"
                  maxLength={20}
                  value={poleConfig.storeName}
                  onChange={(e) => applyConfigUpdate({ storeName: e.target.value })}
                  placeholder="SL MediFlow"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pole-welcome-msg" className="text-xs">
                  Idle Welcome Line (20 chars)
                </Label>
                <Input
                  id="pole-welcome-msg"
                  maxLength={20}
                  value={poleConfig.welcomeMessage}
                  onChange={(e) => applyConfigUpdate({ welcomeMessage: e.target.value })}
                  placeholder="WELCOME! THANK YOU"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pole-revert-sec" className="text-xs">
                  Change Timeout (sec)
                </Label>
                <Input
                  id="pole-revert-sec"
                  type="number"
                  min={2}
                  max={60}
                  value={poleConfig.changeDisplayTimeoutSeconds}
                  onChange={(e) =>
                    applyConfigUpdate({
                      changeDisplayTimeoutSeconds: Math.max(2, parseInt(e.target.value, 10) || 7),
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Live Simulated Hardware Preview */}
            <div className="p-3 rounded-lg bg-zinc-950 text-emerald-400 border border-zinc-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">
                  {poleConfig.protocol === "PRICE_DISPLAY"
                    ? "Simulated 8-Digit LED Preview"
                    : "Simulated 2x20 VFD Idle Preview"}
                </span>
                {poleConfig.protocol === "PRICE_DISPLAY" ? (
                  <div className="text-lg font-bold tracking-widest text-amber-400">0.00</div>
                ) : (
                  <pre className="leading-tight tracking-wider">
                    {`${previewLines.line1}\n${previewLines.line2}`}
                  </pre>
                )}
              </div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300 font-mono text-[10px] self-start sm:self-center">
                {poleConfig.protocol} • {poleConfig.baudRate} baud • {poleConfig.transport}
              </Badge>
            </div>

            {/* PRICE_DISPLAY Baud Recommendation Banner */}
            {poleConfig.protocol === "PRICE_DISPLAY" && (
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-2 text-xs text-cyan-700 dark:text-cyan-300">
                <span>
                  <strong>Price Display (ESC Q A):</strong> Single-line numeric LED/VFD displays typically operate at 2400 baud.
                </span>
                {poleConfig.baudRate !== 2400 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applyConfigUpdate({ baudRate: 2400 })}
                    className="h-7 px-2.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white shrink-0"
                  >
                    Set to 2400 baud
                  </Button>
                )}
              </div>
            )}

            {/* WebSerial Connection Box */}
            {poleConfig.transport === "WEBSERIAL" && (
              <div className="p-3 rounded-lg bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isPoleSerialConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                    }`}
                  />
                  <div>
                    <div className="font-semibold">
                      {!isWebSerialSupported
                        ? "WebSerial Not Supported (Use Chrome or Edge on localhost/HTTPS)"
                        : isPoleSerialConnected
                        ? "WebSerial Port Active (Direct Browser Connection)"
                        : "WebSerial Port Not Open — grant browser COM port access for this session"}
                    </div>
                  </div>
                </div>
                {isWebSerialSupported && (
                  isPoleSerialConnected ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={disconnectPoleSerial}
                      className="text-destructive border-destructive/40 hover:bg-destructive/10 h-8 text-xs shrink-0"
                    >
                      Disconnect Port
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={connectPoleSerial}
                      className="h-8 text-xs shrink-0"
                    >
                      Connect COM Port
                    </Button>
                  )
                )}
              </div>
            )}

            {/* Auto-Detect / Diagnostic Test Frame */}
            <div className="p-3 rounded-lg bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Hardware Auto-Detect / Diagnostic Frame
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Sends {poleConfig.protocol === "PRICE_DISPLAY" ? "8888.88" : "DISPLAY TEST OK"} to verify wiring and baud rate.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={poleTestLoading}
                onClick={() =>
                  runPoleAction(
                    () => sendDiagnosticTest(),
                    "Test frame sent! Check your pole display.",
                    "Test frame failed. Check Bridge or connect WebSerial COM port."
                  )
                }
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-8 text-xs shrink-0"
              >
                {poleTestLoading ? "Sending..." : "Send Test Frame"}
              </Button>
            </div>

            {/* Direct Numeric Amount Test (ESC Q A) */}
            <div className="p-3 rounded-lg bg-background border border-border space-y-2.5">
              <Label className="text-xs font-semibold text-muted-foreground block">
                Direct Numeric & Indicator Lamp Test (ESC Q A)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="text"
                  value={customTestAmount}
                  onChange={(e) => setCustomTestAmount(e.target.value)}
                  placeholder="e.g. 2750.00"
                  className="w-36 h-8 text-xs font-mono font-bold"
                />
                {NUMERIC_TESTS.map((btn) => (
                  <Button
                    key={btn.indicator}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={poleTestLoading}
                    onClick={() =>
                      runPoleAction(
                        () => sendPolePrice(customTestAmount, btn.indicator),
                        `${btn.indicator} amount LKR ${customTestAmount} sent to display.`,
                        `Failed to send ${btn.indicator} numeric frame.`
                      )
                    }
                    className="h-8 text-xs"
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preset POS Lifecycle Diagnostics */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground block">
                POS Checkout Lifecycle Preset Tests
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={poleTestLoading}
                  onClick={() =>
                    runPoleAction(
                      () => testPoleScreen("welcome"),
                      "Idle / Welcome message dispatched.",
                      "Failed to send Welcome message."
                    )
                  }
                  className="h-8 text-xs"
                >
                  {poleConfig.protocol === "PRICE_DISPLAY" ? "Test 8888.88" : "Test Welcome"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={poleTestLoading}
                  onClick={() =>
                    runPoleAction(
                      () => testPoleScreen("item"),
                      "Item scan test dispatched.",
                      "Failed to send Item scan test."
                    )
                  }
                  className="h-8 text-xs"
                >
                  Test Item Scan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={poleTestLoading}
                  onClick={() =>
                    runPoleAction(
                      () => testPoleScreen("payment"),
                      "Payment Total Due dispatched.",
                      "Failed to send Payment Total Due."
                    )
                  }
                  className="h-8 text-xs"
                >
                  Test Total Due
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={poleTestLoading}
                  onClick={() =>
                    runPoleAction(
                      () => testPoleScreen("completed"),
                      "Change Due completion test dispatched.",
                      "Failed to send Change Due test."
                    )
                  }
                  className="h-8 text-xs"
                >
                  Test Change
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={poleTestLoading}
                  onClick={() =>
                    runPoleAction(
                      () => clearPole(),
                      "Pole display cleared.",
                      "Failed to clear pole display."
                    )
                  }
                  className="h-8 text-xs text-destructive hover:text-destructive col-span-2 sm:col-span-1"
                >
                  Clear Screen
                </Button>
              </div>
            </div>

            {/* Troubleshooting Accordion */}
            <div className="border border-border rounded-lg overflow-hidden bg-background">
              <button
                type="button"
                onClick={() => setShowPortHelp((prev) => !prev)}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-between"
              >
                <span>&ldquo;Failed to open serial port&rdquo; &mdash; Troubleshooting Checklist</span>
                {showPortHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showPortHelp && (
                <div className="px-3 pb-3 pt-2 text-[11px] text-muted-foreground space-y-1.5 border-t border-border bg-muted/20">
                  <p>
                    1. <strong>Exclusive COM Port Lock:</strong> Windows locks serial COM ports to one process. Close other utilities or choose between Bridge and WebSerial so they do not compete for the same COM port.
                  </p>
                  <p>
                    2. <strong>Baud Rate Alignment:</strong> Single-line LED8 price displays nearly always use <strong>2400 baud</strong>. 2x20 VFD/LCD displays normally use <strong>9600 baud</strong>.
                  </p>
                  <p>
                    3. <strong>Device Manager Verification:</strong> Open Windows Device Manager &rarr; <em>Ports (COM &amp; LPT)</em> to verify the assigned port (e.g., COM3).
                  </p>
                  <p>
                    4. <strong>WebSerial Support:</strong> Direct browser COM access requires Chrome or Edge on <code>https://</code> or <code>localhost</code>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Secondary Graphic LCD Monitor Section */}
        {(poleConfig.mode === "DUAL_SCREEN" || poleConfig.mode === "BOTH") && (
          <div className="p-4 rounded-xl bg-muted/20 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Monitor className="w-4 h-4 text-primary" />
                Secondary Customer LCD Monitor (Dual Screen)
              </div>
              <p className="text-xs text-muted-foreground">
                Opens the customer-facing receipt &amp; QR checkout display on your secondary monitor via BroadcastChannel &amp; Window Management API.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {showPatientQueueLauncher && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => launchCustomerDisplay("/frontdesk/customer-display")}
                  className="gap-1.5 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Waiting Room Display
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => launchCustomerDisplay("/customer-display")}
                className="gap-1.5 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Launch Customer Display
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
