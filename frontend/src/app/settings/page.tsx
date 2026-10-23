"use client";

import { useState } from "react";
import { useTelemetry } from "@/lib/useTelemetry";
import { Navigation } from "@/components/Navigation";
import { Settings, ShieldAlert, CheckCircle2, AlertTriangle, Power } from "lucide-react";

export default function SettingsPage() {
  const { data, isConnected } = useTelemetry();
  const [minReplicas, setMinReplicas] = useState<number>(1);
  const [maxReplicas, setMaxReplicas] = useState<number>(4);
  const [cooldown, setCooldown] = useState<number>(20);
  const [slaTarget, setSlaTarget] = useState<number>(200);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const scaler = data?.scaler;
  const emergencyStopActive = scaler?.emergency_stop || false;

  const handleSave = () => {
    setSavedMsg("Operational parameters saved and propagated to scaling controller.");
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      <Navigation telemetry={data} isConnected={isConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="border-b border-[#1c2436] pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            System Configuration & Safeguards
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tune scaling boundaries, SLA penalty targets, cooldowns, and manual emergency overrides
          </p>
        </div>

        {savedMsg && (
          <div className="p-4 rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        {/* Emergency Stop Switch */}
        <div
          className={`p-6 rounded-lg border transition-all ${
            emergencyStopActive
              ? "border-rose-600 bg-rose-950/20 ring-1 ring-rose-600"
              : "border-[#1c2436] bg-[#0d121d]"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert
                className={`w-8 h-8 ${emergencyStopActive ? "text-rose-500 animate-pulse" : "text-slate-400"}`}
              />
              <div>
                <h2 className="text-base font-bold text-white">Emergency Stop Safeguard</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Immediately freezes the scaling controller. Rejects all scale-out and scale-in requests.
                </p>
              </div>
            </div>

            <button
              onClick={() => alert("Emergency stop toggle sent to controller")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                emergencyStopActive
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "border border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300"
              }`}
            >
              <Power className="w-4 h-4" />
              {emergencyStopActive ? "DEACTIVATE EMERGENCY STOP" : "ACTIVATE EMERGENCY STOP"}
            </button>
          </div>
        </div>

        {/* Parameter Sliders & Thresholds */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-[#1c2436] pb-3">
            <Settings className="w-4 h-4 text-cyan-400" />
            Autoscaling Thresholds & Limits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex justify-between">
                <span>Minimum Replicas (Bound)</span>
                <span className="text-cyan-400 font-bold">{minReplicas} Instance</span>
              </label>
              <input
                type="number"
                min="1"
                max="2"
                value={minReplicas}
                onChange={(e) => setMinReplicas(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded border border-[#23314f] bg-[#090d16] text-white text-xs font-mono"
              />
              <span className="text-[11px] text-slate-500">The controller will never terminate the last replica</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex justify-between">
                <span>Maximum Replicas (Cap)</span>
                <span className="text-purple-400 font-bold">{maxReplicas} Instances</span>
              </label>
              <input
                type="number"
                min="2"
                max="8"
                value={maxReplicas}
                onChange={(e) => setMaxReplicas(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded border border-[#23314f] bg-[#090d16] text-white text-xs font-mono"
              />
              <span className="text-[11px] text-slate-500">Maximum concurrent Docker container limit</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex justify-between">
                <span>Anti-Flapping Cooldown</span>
                <span className="text-amber-400 font-bold">{cooldown} Seconds</span>
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded border border-[#23314f] bg-[#090d16] text-white text-xs font-mono"
              />
              <span className="text-[11px] text-slate-500">Minimum delay between scaling actions</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex justify-between">
                <span>SLA Latency Target</span>
                <span className="text-emerald-400 font-bold">{slaTarget} ms</span>
              </label>
              <input
                type="number"
                min="50"
                max="1000"
                step="25"
                value={slaTarget}
                onChange={(e) => setSlaTarget(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded border border-[#23314f] bg-[#090d16] text-white text-xs font-mono"
              />
              <span className="text-[11px] text-slate-500">p95 latency threshold before reward penalty</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1c2436] flex justify-end">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
