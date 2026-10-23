"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Cpu, Box, Flame, Brain, BarChart2, Settings, Zap } from "lucide-react";
import { TelemetryPayload } from "@/lib/types";

interface NavigationProps {
  telemetry: TelemetryPayload | null;
  isConnected: boolean;
}

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/monitoring", label: "Live Monitoring", icon: Cpu },
  { href: "/containers", label: "Containers", icon: Box },
  { href: "/workload", label: "Workload", icon: Flame },
  { href: "/agent", label: "DQN Agent", icon: Brain },
  { href: "/experiments", label: "Experiments", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navigation({ telemetry, isConnected }: NavigationProps) {
  const pathname = usePathname();

  const mode = telemetry?.mode || "MANUAL";
  const replicas = telemetry?.scaler?.current_replicas ?? 0;
  const isOperating = telemetry?.scaler?.is_operating;

  return (
    <header className="border-b border-[#1c2436] bg-[#090d16]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Connection Badge */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-cyan-400" />
                MARS
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Adaptive RL Scaler
              </span>
            </Link>

            {/* Live Connection Beacon */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-[#1c2436] bg-[#0d121d] text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>
                {isConnected ? "LIVE STREAM" : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? "bg-[#161f33] text-cyan-400 font-medium border border-[#23314f]"
                      : "text-slate-300 hover:text-white hover:bg-[#121929]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Real-time Status Chips */}
          <div className="flex items-center space-x-3">
            {/* Mode Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#1c2436] bg-[#0d121d] text-xs font-mono">
              <span className="text-slate-400">MODE:</span>
              <span
                className={`font-semibold ${
                  mode === "DQN"
                    ? "text-purple-400"
                    : mode === "BASELINE"
                    ? "text-amber-400"
                    : "text-slate-200"
                }`}
              >
                {mode}
              </span>
            </div>

            {/* Replicas count */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1c2436] bg-[#0d121d] text-xs font-mono">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300 tabular-nums">
                {replicas} / 4
              </span>
              {isOperating && (
                <span className="text-amber-400 animate-pulse">SCALING...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden border-t border-[#1c2436] px-4 py-2 flex items-center justify-between overflow-x-auto gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs whitespace-nowrap ${
                isActive
                  ? "bg-[#161f33] text-cyan-400 font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
