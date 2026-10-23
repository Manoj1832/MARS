"use client";

import { useState, useEffect } from "react";
import { useTelemetry } from "@/lib/useTelemetry";
import { Navigation } from "@/components/Navigation";
import { BarChart2, Download, Play, CheckCircle2, ShieldCheck } from "lucide-react";

interface ExperimentSummary {
  id: string;
  name: string;
  timestamp: number;
  strategy: "DQN" | "BASELINE";
  duration_seconds: number;
  avg_throughput_rps: number;
  p95_latency_ms: number;
  error_rate: number;
  scaling_events_count: number;
  avg_replicas: number;
  sla_violations_count: number;
}

export default function ExperimentsPage() {
  const { data, isConnected } = useTelemetry();
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<"DQN" | "BASELINE">("DQN");

  const currentMode = data?.mode;
  const p95 = data?.workload?.p95_latency_ms || data?.application?.p95_latency_ms || 0;
  const rps = data?.workload?.measured_rps || data?.application?.throughput_rps || 0;
  const replicas = data?.scaler?.current_replicas || 0;
  const errorRate = data?.application?.error_rate || 0;

  useEffect(() => {
    async function loadExps() {
      try {
        const resp = await fetch("http://localhost:8000/api/experiments");
        if (resp.ok) {
          const list = await resp.json();
          setExperiments(list);
        }
      } catch (e) {
        // Backend offline
      }
    }
    loadExps();
  }, []);

  const handleExport = (expId: string, format: "csv" | "json") => {
    window.open(`http://localhost:8000/api/experiments/export?experiment_id=${expId}&format=${format}`);
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      <Navigation telemetry={data} isConnected={isConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="border-b border-[#1c2436] pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Autoscaling Experiment Benchmarks
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Comparative evaluation: Adaptive DQN Reinforcement Learning vs. Static CPU-Threshold Baseline
          </p>
        </div>

        {/* Real-time Side-by-Side Comparison Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DQN Column */}
          <div
            className={`p-6 rounded-lg border transition-all ${
              currentMode === "DQN"
                ? "border-purple-600/80 bg-purple-950/10 ring-1 ring-purple-600"
                : "border-[#1c2436] bg-[#0d121d]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                DQN Adaptive Agent Policy
              </h2>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  currentMode === "DQN"
                    ? "border-purple-800 bg-purple-950/60 text-purple-300"
                    : "border-[#1c2436] text-slate-500"
                }`}
              >
                {currentMode === "DQN" ? "CURRENTLY ACTIVE" : "STANDBY"}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Control Paradigm:</span>
                <span className="text-slate-200">Deep Q-Network (Q-Value Policy)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Decision Inputs:</span>
                <span className="text-slate-200">6-dim (Replicas, CPU, Mem, RPS, Latency, Errors)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Optimization Goal:</span>
                <span className="text-purple-300 font-bold">Multi-Metric Reward Maximization</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Anti-Thrashing:</span>
                <span className="text-emerald-400">20s Cooldown + Step Penalty (w_act = 0.2)</span>
              </div>
            </div>
          </div>

          {/* Static Baseline Column */}
          <div
            className={`p-6 rounded-lg border transition-all ${
              currentMode === "BASELINE"
                ? "border-amber-600/80 bg-amber-950/10 ring-1 ring-amber-600"
                : "border-[#1c2436] bg-[#0d121d]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Static CPU-Threshold Baseline
              </h2>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  currentMode === "BASELINE"
                    ? "border-amber-800 bg-amber-950/60 text-amber-300"
                    : "border-[#1c2436] text-slate-500"
                }`}
              >
                {currentMode === "BASELINE" ? "CURRENTLY ACTIVE" : "STANDBY"}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Control Paradigm:</span>
                <span className="text-slate-200">Fixed Rule-Based Threshold</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Decision Inputs:</span>
                <span className="text-slate-200">Container CPU% only</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Scale Out Rule:</span>
                <span className="text-amber-300 font-bold">Average CPU &gt; 75% for 2 intervals</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#161f33]">
                <span className="text-slate-400">Scale In Rule:</span>
                <span className="text-slate-200">Average CPU &lt; 30% for 3 intervals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Experiments & Data Export */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Recorded Experiment Datasets
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Zero mock records: populated upon test runs
            </span>
          </div>

          {experiments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1c2436] text-slate-400">
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3">Throughput (RPS)</th>
                    <th className="py-2.5 px-3">p95 Latency</th>
                    <th className="py-2.5 px-3">Scaling Events</th>
                    <th className="py-2.5 px-3">SLA Violations</th>
                    <th className="py-2.5 px-3 text-right">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161f33]">
                  {experiments.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#121929] transition-colors">
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">{exp.id.slice(0, 8)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            exp.strategy === "DQN"
                              ? "bg-purple-950 border border-purple-800 text-purple-300"
                              : "bg-amber-950 border border-amber-800 text-amber-300"
                          }`}
                        >
                          {exp.strategy}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white">{exp.avg_throughput_rps} rps</td>
                      <td className="py-2.5 px-3 text-amber-400">{exp.p95_latency_ms} ms</td>
                      <td className="py-2.5 px-3 text-slate-200">{exp.scaling_events_count}</td>
                      <td className="py-2.5 px-3 text-rose-400">{exp.sla_violations_count}</td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleExport(exp.id, "csv")}
                          className="px-2 py-1 rounded bg-[#161f33] hover:bg-[#23314f] text-cyan-400 text-[10px] font-bold uppercase transition-colors"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport(exp.id, "json")}
                          className="px-2 py-1 rounded bg-[#161f33] hover:bg-[#23314f] text-purple-400 text-[10px] font-bold uppercase transition-colors"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-slate-500 font-mono">
              No recorded benchmark experiments found yet. Run an automated test or traffic workload to record real data.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
