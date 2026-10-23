"use client";

import { useTelemetry } from "@/lib/useTelemetry";
import { Navigation } from "@/components/Navigation";
import { Cpu, Database, TrendingUp, Clock, Box } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function MonitoringPage() {
  const { data, isConnected, history } = useTelemetry();
  const containers = data?.containers?.containers || [];

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      <Navigation telemetry={data} isConnected={isConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Live Monitoring & Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time operating system, container stats, and application latency
          </p>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU & Memory Chart */}
          <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Host CPU & Memory Utilization (%)
              </h2>
              <span className="text-xs font-mono text-slate-400">Time-series (30s)</span>
            </div>
            <div className="h-64 w-full">
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1c2436" strokeDasharray="3 3" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#090d16", borderColor: "#1c2436", fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hostCpu"
                      name="Host CPU %"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#cpuGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="hostMem"
                      name="Host Mem %"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#memGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                  Gathering live metrics for time-series...
                </div>
              )}
            </div>
          </div>

          {/* Throughput & Latency Chart */}
          <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Throughput (RPS) & p95 Latency (ms)
              </h2>
              <span className="text-xs font-mono text-slate-400">Time-series (30s)</span>
            </div>
            <div className="h-64 w-full">
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1c2436" strokeDasharray="3 3" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#090d16", borderColor: "#1c2436", fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rps"
                      name="RPS"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#rpsGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="latencyP95"
                      name="p95 Latency (ms)"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#latGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                  Gathering live metrics for time-series...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Per-Container Resource Allocation Table */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              Per-Container Genuine Telemetry
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Total Instances: {containers.length}
            </span>
          </div>

          {containers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1c2436] text-slate-400">
                    <th className="py-2.5 px-3">Container ID</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Health</th>
                    <th className="py-2.5 px-3">CPU %</th>
                    <th className="py-2.5 px-3">Memory (MB)</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161f33]">
                  {containers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#121929] transition-colors">
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">{c.id}</td>
                      <td className="py-2.5 px-3 text-slate-300">{c.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px]">
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 text-[10px]">
                          {c.health}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">{c.cpu_percent}%</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {c.memory_used_mb} MB ({c.memory_percent}%)
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{c.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-slate-500 font-mono">
              {data?.scaler?.docker_available
                ? "No benchmark containers active. Scale out from the Containers page."
                : "Docker daemon offline. Start docker with 'sudo systemctl start docker'."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
