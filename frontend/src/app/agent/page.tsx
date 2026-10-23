"use client";

import { useState } from "react";
import { useTelemetry } from "@/lib/useTelemetry";
import { Navigation } from "@/components/Navigation";
import { Brain, Play, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

export default function AgentPage() {
  const { data, isConnected } = useTelemetry();
  const [episodes, setEpisodes] = useState<number>(50);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const agent = data?.agent;
  const currentMode = data?.mode || "MANUAL";
  const stateVector = agent?.last_state || [];
  const qValues = agent?.last_q_values || [0, 0, 0];

  const handleTrain = async () => {
    setIsTraining(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const resp = await fetch("http://localhost:8000/api/agent/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes, batch_size: 32 }),
      });
      const res = await resp.json();
      if (!resp.ok) throw new Error(res.detail || "Training initiation failed");
      setStatusMsg(`Training started in background for ${episodes} episodes. Checkpoint will be saved upon completion.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed starting training");
    } finally {
      setIsTraining(false);
    }
  };

  const handleToggleAutonomous = async (enable: boolean) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const url = enable
        ? "http://localhost:8000/api/agent/enable?mode=DQN"
        : "http://localhost:8000/api/agent/disable";
      const resp = await fetch(url, { method: "POST" });
      const res = await resp.json();
      if (!resp.ok) throw new Error(res.detail || "Mode toggle failed");
      setStatusMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed updating agent mode");
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      <Navigation telemetry={data} isConnected={isConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c2436] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Deep Q-Network (DQN) Brain
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Reinforcement learning control policy and action-value estimates
            </p>
          </div>

          {/* Autonomous Mode Toggle */}
          <div className="flex items-center gap-3">
            {currentMode !== "DQN" ? (
              <button
                onClick={() => handleToggleAutonomous(true)}
                disabled={!agent?.is_trained}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Zap className="w-4 h-4" />
                Enable Autonomous DQN
              </button>
            ) : (
              <button
                onClick={() => handleToggleAutonomous(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#161f33] hover:bg-[#1f2b45] border border-[#23314f] text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Revert to Manual
              </button>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className="p-4 rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded border border-rose-800 bg-rose-950/40 text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Model State & Validation Guard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-2">
            <div className="text-xs font-mono text-slate-400 uppercase">Model Status</div>
            <div className="text-xl font-bold flex items-center gap-2">
              {agent?.is_trained ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300">Trained & Validated</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-300">Untrained Checkpoint</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Autonomous scaling requires verified training.
            </div>
          </div>

          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-2">
            <div className="text-xs font-mono text-slate-400 uppercase">Training Steps</div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {agent?.train_steps ?? 0}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Replay Buffer: {agent?.buffer_size ?? 0} / 10,000 Transitions
            </div>
          </div>

          <div className="p-5 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-2">
            <div className="text-xs font-mono text-slate-400 uppercase">Exploration Epsilon</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono tabular-nums">
              {agent?.epsilon ?? 1.0}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Last Huber Loss: {agent?.last_loss ?? 0.0}
            </div>
          </div>
        </div>

        {/* Q-Values & Action Distribution */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-[#1c2436] pb-3">
            <Brain className="w-4 h-4 text-purple-400" />
            Predicted Action Values Q(s, a)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div
              className={`p-4 rounded border transition-all ${
                agent?.last_action === 0
                  ? "border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500"
                  : "border-[#1c2436] bg-[#080b11]"
              }`}
            >
              <div className="text-xs font-mono text-slate-400 uppercase">Action 0: Scale In (-1)</div>
              <div className="text-2xl font-bold text-white mt-2 font-mono tabular-nums">
                {qValues[0]?.toFixed(3) ?? "0.000"}
              </div>
              {agent?.last_action === 0 && (
                <div className="text-[10px] font-bold text-cyan-400 mt-1 uppercase">SELECTED ACTION</div>
              )}
            </div>

            <div
              className={`p-4 rounded border transition-all ${
                agent?.last_action === 1
                  ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500"
                  : "border-[#1c2436] bg-[#080b11]"
              }`}
            >
              <div className="text-xs font-mono text-slate-400 uppercase">Action 1: Maintain (0)</div>
              <div className="text-2xl font-bold text-white mt-2 font-mono tabular-nums">
                {qValues[1]?.toFixed(3) ?? "0.000"}
              </div>
              {agent?.last_action === 1 && (
                <div className="text-[10px] font-bold text-emerald-400 mt-1 uppercase">SELECTED ACTION</div>
              )}
            </div>

            <div
              className={`p-4 rounded border transition-all ${
                agent?.last_action === 2
                  ? "border-purple-500 bg-purple-950/20 ring-1 ring-purple-500"
                  : "border-[#1c2436] bg-[#080b11]"
              }`}
            >
              <div className="text-xs font-mono text-slate-400 uppercase">Action 2: Scale Out (+1)</div>
              <div className="text-2xl font-bold text-white mt-2 font-mono tabular-nums">
                {qValues[2]?.toFixed(3) ?? "0.000"}
              </div>
              {agent?.last_action === 2 && (
                <div className="text-[10px] font-bold text-purple-400 mt-1 uppercase">SELECTED ACTION</div>
              )}
            </div>
          </div>
        </div>

        {/* Normalized State Vector Observation */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-[#1c2436] pb-3">
            <span className="text-slate-400 font-mono text-sm">s ∈ ℝ⁶</span>
            Current Observed Normalized State Vector
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "s₀: Replicas", val: stateVector[0] ?? 0 },
              { label: "s₁: Host CPU", val: stateVector[1] ?? 0 },
              { label: "s₂: Host Mem", val: stateVector[2] ?? 0 },
              { label: "s₃: Throughput", val: stateVector[3] ?? 0 },
              { label: "s₄: p95 Latency", val: stateVector[4] ?? 0 },
              { label: "s₅: Error Rate", val: stateVector[5] ?? 0 },
            ].map((feature, idx) => (
              <div key={idx} className="p-3 rounded border border-[#1c2436] bg-[#080b11] text-center">
                <div className="text-[11px] font-mono text-slate-400">{feature.label}</div>
                <div className="text-lg font-bold text-cyan-400 mt-1 font-mono tabular-nums">
                  {Number(feature.val).toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training Trigger Panel */}
        <div className="p-6 rounded-lg border border-[#1c2436] bg-[#0d121d] space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-[#1c2436] pb-3">
            <Play className="w-4 h-4 text-emerald-400" />
            Controlled Offline Training Pipeline
          </h2>
          <p className="text-xs text-slate-400">
            Trains the Deep Q-Network on simulated environment transitions derived from actual system boundaries.
            Does not flood production containers.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-300">Episodes:</span>
              <input
                type="number"
                min="10"
                max="500"
                step="10"
                value={episodes}
                onChange={(e) => setEpisodes(Number(e.target.value))}
                className="w-24 px-3 py-1.5 rounded border border-[#23314f] bg-[#090d16] text-white text-xs font-mono"
              />
            </div>

            <button
              onClick={handleTrain}
              disabled={isTraining}
              className="flex items-center gap-1.5 px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {isTraining ? "Training..." : "Start Training Loop"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
