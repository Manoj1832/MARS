"use client";

import { useTelemetry } from "@/lib/useTelemetry";
import { Navigation } from "@/components/Navigation";
import {
  Activity,
  Cpu,
  Database,
  Box,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Brain,
} from "lucide-react";
import Link from "next/link";

export default function OverviewPage() {
  const { data, isConnected, error, history } = useTelemetry();

  const hostCpu = data?.host?.cpu?.utilization_percent ?? null;
  const hostMem = data?.host?.memory?.utilization_percent ?? null;
  const rps = data?.workload?.measured_rps ?? data?.application?.throughput_rps ?? 0;
  const p50 = data?.workload?.p50_latency_ms ?? data?.application?.p50_latency_ms ?? 0;
  const p95 = data?.workload?.p95_latency_ms ?? data?.application?.p95_latency_ms ?? 0;
  const errRate = data?.application?.error_rate ?? 0;
  const replicas = data?.scaler?.current_replicas ?? 0;
  const healthyCount = data?.scaler?.healthy_replicas ?? 0;
  const agentStatus = data?.agent;
  const lastEvent = data?.scaler?.last_event;
  const dockerAvailable = data?.scaler?.docker_available ?? false;

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      <Navigation telemetry={data} isConnected={isConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner if disconnected or Docker down */}
        {!isConnected && (
          <div className="p-4 rounded-lg border border-amber-900/60 bg-amber-950/30 text-amber-300 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Backend WebSocket offline. Run:{" "}
                <code className="bg-black/40 px-2 py-0.5 rounded text-amber-200 font-mono">
                  .venv/bin/uvicorn backend.main:app --port 8000
                </code>
              </span>
            </div>
            <span className="text-xs font-mono">RECONNECTING...</span>
          </div>
        )}

        {isConnected && !dockerAvailable && (
          <div className="p-4 rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>
                Docker Engine is unreachable. Start the Docker service on the host:{" "}
                <code className="bg-black/40 px-2 py-0.5 rounded text-rose-200 font-mono">
                  sudo systemctl start docker
                </code>
              </span>
            </div>
            <span className="text-xs font-mono text-rose-400">DOCKER DOWN</span>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c2436] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              System Telemetry Overview
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Multi-Metric Adaptive Reinforcement-learning Scaling Control Plane
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/workload"
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold tracking-wide uppercase transition-colors"
            >
              Control Workload
            </Link>
            <Link
              href="/agent"
              className="px-4 py-2 rounded bg-[#161f33] hover:bg-[#1f2b45] border border-[#23314f] text-cyan-400 text-xs font-semibold tracking-wide uppercase transition-colors"
            >
              Configure DQN
            </Link>
          </div>
        </div>

        {/* Key Real Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Host CPU */}
          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
              <span>Host CPU Usage</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
                {hostCpu !== null ? `${hostCpu}%` : "—"}
              </span>
              <span className="text-xs text-slate-400">
                {data?.host?.cpu?.logical_cores ?? 0} Cores
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-[#161f33] rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, hostCpu || 0)}%` }}
              />
            </div>
          </div>

          {/* Host Memory */}
          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
              <span>Host Memory</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
                {hostMem !== null ? `${hostMem}%` : "—"}
              </span>
              <span className="text-xs text-slate-400">
                {data?.host?.memory?.used_gb ?? 0} / {data?.host?.memory?.total_gb ?? 0} GB
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-[#161f33] rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, hostMem || 0)}%` }}
              />
            </div>
          </div>

          {/* Application Throughput */}
          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
              <span>Throughput</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
                {rps}
              </span>
              <span className="text-xs text-slate-400">Requests / Sec</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 font-mono">
              Status:{" "}
              <span
                className={`font-semibold ${
                  data?.workload?.status === "SPIKE"
                    ? "text-rose-400"
                    : data?.workload?.status === "RUNNING"
                    ? "text-emerald-400"
                    : "text-slate-400"
                }`}
              >
                {data?.workload?.status || "STOPPED"}
              </span>
            </div>
          </div>

          {/* Latency (p50 / p95) */}
          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
              <span>Response Latency</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
                {p95}
              </span>
              <span className="text-xs text-slate-400">ms (p95)</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>p50: {p50} ms</span>
              <span className={errRate > 0 ? "text-rose-400" : "text-emerald-400"}>
                Err: {(errRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Grid: Scaler State & Agent Brain */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Container Replicas */}
          <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-cyan-400" />
                Active Container Pool
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Healthy: {healthyCount} / {replicas}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((slot) => {
                const isActive = slot <= replicas;
                return (
                  <div
                    key={slot}
                    className={`p-3 rounded border text-center transition-all ${
                      isActive
                        ? "border-emerald-700/60 bg-emerald-950/20 text-emerald-300"
                        : "border-[#1c2436] bg-[#080b11] text-slate-600"
                    }`}
                  >
                    <div className="text-xs font-mono uppercase">Node #{slot}</div>
                    <div className="text-lg font-bold mt-1">
                      {isActive ? "ACTIVE" : "OFFLINE"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Latest Verified Scaling Event */}
            <div className="pt-2 text-xs font-mono text-slate-400 border-t border-[#1c2436]">
              <span className="text-slate-500 uppercase">Latest Scaling Event:</span>
              {lastEvent ? (
                <div className="mt-1 flex items-center justify-between text-slate-300">
                  <span className="text-cyan-400 font-semibold">
                    {lastEvent.action_requested.toUpperCase()}
                  </span>
                  <span>{lastEvent.action_executed}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lastEvent.status === "VERIFIED"
                        ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                        : "bg-rose-950 border border-rose-800 text-rose-300"
                    }`}
                  >
                    {lastEvent.status}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-slate-500">No scaling events recorded yet.</div>
              )}
            </div>
          </div>

          {/* DQN Reinforcement Learning Status */}
          <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                DQN Agent Decision Engine
              </h2>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  agentStatus?.is_trained
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-400"
                    : "border-amber-800 bg-amber-950/40 text-amber-400"
                }`}
              >
                {agentStatus?.is_trained ? "CHECKPOINT VALIDATED" : "REQUIRES TRAINING"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded border border-[#1c2436] bg-[#080b11]">
                <div className="text-[11px] font-mono text-slate-400">Scale In Q(s, 0)</div>
                <div className="text-base font-bold text-slate-200 mt-1 tabular-nums">
                  {agentStatus?.last_q_values?.[0] ?? "0.0"}
                </div>
              </div>
              <div className="p-3 rounded border border-[#1c2436] bg-[#080b11]">
                <div className="text-[11px] font-mono text-slate-400">Maintain Q(s, 1)</div>
                <div className="text-base font-bold text-slate-200 mt-1 tabular-nums">
                  {agentStatus?.last_q_values?.[1] ?? "0.0"}
                </div>
              </div>
              <div className="p-3 rounded border border-[#1c2436] bg-[#080b11]">
                <div className="text-[11px] font-mono text-slate-400">Scale Out Q(s, 2)</div>
                <div className="text-base font-bold text-slate-200 mt-1 tabular-nums">
                  {agentStatus?.last_q_values?.[2] ?? "0.0"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1c2436]">
              <span className="text-slate-400">
                Action: <span className="text-cyan-400 font-bold">{agentStatus?.last_action_name || "MAINTAIN"}</span>
              </span>
              <span className="text-slate-400">
                Epsilon (Exploration): <span className="text-slate-200">{agentStatus?.epsilon ?? 1.0}</span>
              </span>
              <span className="text-slate-400">
                Reward: <span className="text-amber-400">{agentStatus?.last_reward ?? 0.0}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Mini Time-Series Feed */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Telemetry Feed (Recent 30 Samples)
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Refresh Interval: 1.0s
            </span>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1c2436] text-slate-400">
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Host CPU</th>
                    <th className="py-2 px-3">Host Mem</th>
                    <th className="py-2 px-3">Cont Avg CPU</th>
                    <th className="py-2 px-3">Throughput</th>
                    <th className="py-2 px-3">p95 Latency</th>
                    <th className="py-2 px-3">Replicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161f33]">
                  {history.slice(-5).reverse().map((h, i) => (
                    <tr key={i} className="hover:bg-[#121929] transition-colors">
                      <td className="py-2 px-3 text-slate-300">{h.time}</td>
                      <td className="py-2 px-3 text-cyan-400">{h.hostCpu}%</td>
                      <td className="py-2 px-3 text-purple-400">{h.hostMem}%</td>
                      <td className="py-2 px-3 text-slate-200">{h.containerCpuAvg}%</td>
                      <td className="py-2 px-3 text-emerald-400">{h.rps} rps</td>
                      <td className="py-2 px-3 text-amber-400">{h.latencyP95} ms</td>
                      <td className="py-2 px-3 text-white font-bold">{h.replicas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-slate-500 font-mono">
              Awaiting live metrics stream from FastAPI...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
