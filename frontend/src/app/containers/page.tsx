"use client";

import { useState } from "react";
import { useTelemetry } from "@/lib/useTelemetry";
import { Navigation } from "@/components/Navigation";
import { Box, Plus, Minus, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

export default function ContainersPage() {
  const { data, isConnected } = useTelemetry();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const scaler = data?.scaler;
  const containers = data?.containers?.containers || [];
  const inCooldown = scaler?.in_cooldown || false;
  const remainingCooldown = scaler?.remaining_cooldown_seconds || 0;
  const currentCount = scaler?.current_replicas || 0;
  const minReplicas = scaler?.min_replicas || 1;
  const maxReplicas = scaler?.max_replicas || 4;

  const handleScale = async (action: "scale_out" | "scale_in") => {
    setLoadingAction(action);
    setActionError(null);
    setActionSuccess(null);

    try {
      const resp = await fetch("http://localhost:8000/api/scaling/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: `Manual UI ${action}` }),
      });
      const res = await resp.json();
      if (!resp.ok) {
        throw new Error(res.detail || "Scaling operation rejected");
      }
      setActionSuccess(
        `Verified: ${action === "scale_out" ? "Scale Out" : "Scale In"} succeeded! Replica count changed from ${res.old_replicas} to ${res.new_replicas}.`
      );
    } catch (err: any) {
      setActionError(err.message || "Failed executing scaling operation");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      <Navigation telemetry={data} isConnected={isConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c2436] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Container Lifecycle & Scaling Controller
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real Docker container orchestration behind NGINX load balancer
            </p>
          </div>

          {/* Scale Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleScale("scale_in")}
              disabled={loadingAction !== null || inCooldown || currentCount <= minReplicas}
              className="flex items-center gap-1.5 px-4 py-2 rounded border border-[#23314f] bg-[#161f33] hover:bg-[#1f2b45] text-slate-200 text-xs font-semibold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-4 h-4" />
              Scale In
            </button>

            <button
              onClick={() => handleScale("scale_out")}
              disabled={loadingAction !== null || inCooldown || currentCount >= maxReplicas}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Scale Out
            </button>
          </div>
        </div>

        {/* Action status message */}
        {actionSuccess && (
          <div className="p-4 rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded border border-rose-800 bg-rose-950/40 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Cooldown Alert */}
        {inCooldown && (
          <div className="p-4 rounded border border-amber-900 bg-amber-950/20 text-amber-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>
                Scaling controller in anti-thrashing cooldown:{" "}
                <span className="font-bold">{remainingCooldown}s remaining</span>
              </span>
            </div>
            <span className="text-xs font-mono">COOLDOWN ACTIVE</span>
          </div>
        )}

        {/* Containers Table */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              Active Docker Containers ({containers.length} / {maxReplicas} Max)
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Min Replicas: {minReplicas} | Max Replicas: {maxReplicas}
            </span>
          </div>

          {containers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1c2436] text-slate-400">
                    <th className="py-3 px-3">Container ID</th>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">State</th>
                    <th className="py-3 px-3">Health Check</th>
                    <th className="py-3 px-3">CPU Usage</th>
                    <th className="py-3 px-3">Memory (MB / %)</th>
                    <th className="py-3 px-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161f33]">
                  {containers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#121929] transition-colors">
                      <td className="py-3 px-3 text-cyan-400 font-bold">{c.id}</td>
                      <td className="py-3 px-3 text-slate-200">{c.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.health === "healthy"
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800"
                              : "bg-amber-950/40 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {c.health.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-bold">{c.cpu_percent}%</td>
                      <td className="py-3 px-3 text-slate-300">
                        {c.memory_used_mb} MB ({c.memory_percent}%)
                      </td>
                      <td className="py-3 px-3 text-slate-400">{c.created?.slice(0, 19) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-slate-500 font-mono">
              {scaler?.docker_available
                ? "No containers currently running. Click 'Scale Out' to spawn an instance."
                : "Docker Engine is offline. Start Docker service to enable container scaling."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
