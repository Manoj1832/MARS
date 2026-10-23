"use client";

import { useState } from "react";
import { useTelemetry } from "@/lib/useTelemetry";
import { Navigation } from "@/components/Navigation";
import { Flame, Play, Square, Zap, TrendingDown, Clock, AlertTriangle } from "lucide-react";

export default function WorkloadPage() {
  const { data, isConnected } = useTelemetry();
  const [targetRps, setTargetRps] = useState<number>(30);
  const [concurrency, setConcurrency] = useState<number>(8);
  const [duration, setDuration] = useState<number>(120);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const workload = data?.workload;
  const isRunning = workload?.status === "RUNNING" || workload?.status === "SPIKE";

  const handleAction = async (endpoint: string, body?: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch(`http://localhost:8000/api/workload/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const res = await resp.json();
      if (!resp.ok) {
        throw new Error(res.detail || "Workload request failed");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed executing workload command");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      <Navigation telemetry={data} isConnected={isConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="border-b border-[#1c2436] pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Real HTTP Workload Generator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sends genuine asynchronous requests through NGINX to the containerized benchmark app
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded border border-rose-800 bg-rose-950/40 text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live Workload Metrics Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="text-slate-400 text-xs font-mono uppercase">Status</div>
            <div className="mt-2 text-2xl font-bold font-mono">
              <span
                className={
                  workload?.status === "SPIKE"
                    ? "text-rose-400 animate-pulse"
                    : workload?.status === "RUNNING"
                    ? "text-emerald-400"
                    : "text-slate-500"
                }
              >
                {workload?.status || "STOPPED"}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono">
              Target: {workload?.target_rps ?? 0} RPS | Concurrency: {workload?.concurrency ?? 0}
            </div>
          </div>

          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="text-slate-400 text-xs font-mono uppercase">Measured Rate</div>
            <div className="mt-2 text-3xl font-bold text-cyan-400 font-mono tabular-nums">
              {workload?.measured_rps ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono">Requests / Second (Actual)</div>
          </div>

          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="text-slate-400 text-xs font-mono uppercase">Total Traffic Sent</div>
            <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
              {workload?.total_requests ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono">
              200 OK: <span className="text-emerald-400">{workload?.successful_requests ?? 0}</span> | 
              Fail: <span className="text-rose-400">{workload?.failed_requests ?? 0}</span>
            </div>
          </div>

          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="text-slate-400 text-xs font-mono uppercase">Measured Latency</div>
            <div className="mt-2 text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {workload?.p95_latency_ms ?? 0} ms
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono">
              p50: {workload?.p50_latency_ms ?? 0} ms | Timeouts: {workload?.timeout_requests ?? 0}
            </div>
          </div>
        </div>

        {/* Workload Control Panel */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-[#1c2436] pb-3">
            <Flame className="w-4 h-4 text-rose-400" />
            Traffic Generation Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Target RPS */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex justify-between">
                <span>Target Throughput</span>
                <span className="text-cyan-400 font-bold">{targetRps} RPS</span>
              </label>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={targetRps}
                onChange={(e) => setTargetRps(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-cyan-500 bg-[#161f33]"
              />
              <span className="text-[11px] text-slate-500">Range: 5 – 200 req/sec</span>
            </div>

            {/* Concurrency */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex justify-between">
                <span>Async Worker Concurrency</span>
                <span className="text-purple-400 font-bold">{concurrency} Workers</span>
              </label>
              <input
                type="range"
                min="2"
                max="32"
                step="2"
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-purple-500 bg-[#161f33]"
              />
              <span className="text-[11px] text-slate-500">Range: 2 – 32 concurrent HTTP tasks</span>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex justify-between">
                <span>Workload Duration</span>
                <span className="text-amber-400 font-bold">{duration}s</span>
              </label>
              <input
                type="number"
                min="10"
                max="600"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isRunning}
                className="w-full px-3 py-1.5 rounded border border-[#23314f] bg-[#090d16] text-white text-xs font-mono"
              />
              <span className="text-[11px] text-slate-500">Time to send traffic (seconds)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#1c2436]">
            {!isRunning ? (
              <button
                onClick={() =>
                  handleAction("start", {
                    target_rps: targetRps,
                    concurrency,
                    duration_seconds: duration,
                  })
                }
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Workload
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleAction("stop")}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop Workload
                </button>

                <button
                  onClick={() => handleAction("spike", { multiplier: 2.5 })}
                  disabled={loading || workload?.status === "SPIKE"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded border border-rose-700 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-rose-400" />
                  Trigger Traffic Spike (2.5x)
                </button>

                <button
                  onClick={() => handleAction("reduce", { factor: 0.5 })}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded border border-[#23314f] bg-[#161f33] hover:bg-[#1f2b45] text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <TrendingDown className="w-4 h-4 text-slate-400" />
                  Reduce Traffic (0.5x)
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
