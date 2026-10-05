import React from 'react';
import { RefreshCw, CheckCircle2, Activity, Clock, AlertTriangle, Layers } from 'lucide-react';
import { SessionStats, RunnerStatus } from '../types';
import { motion } from 'motion/react';

interface MetricsCardsProps {
  stats: SessionStats;
  uptimeSeconds: number;
  runnerStatus: RunnerStatus;
  totalTargets: number;
  activeTargets: number;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  stats,
  uptimeSeconds,
  runnerStatus,
  totalTargets,
  activeTargets,
}) => {
  const isRunning = runnerStatus === 'running';

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const successRate = stats.totalRefreshes > 0
    ? Math.round((stats.successfulRefreshes / stats.totalRefreshes) * 100)
    : 100;

  const cardVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    hover: { y: -2, transition: { duration: 0.15 } },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Refreshes */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-[#181a22] p-4 rounded-2xl border border-white/10 hover:border-white/20 shadow-xl shadow-black/25 relative overflow-hidden transition-all"
      >
        <div className="flex items-center justify-between text-zinc-400 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Refreshes</span>
          <div className="w-7 h-7 rounded-xl bg-[#20232c] border border-white/10 text-white flex items-center justify-center">
            <RefreshCw className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
          {stats.totalRefreshes}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5 font-mono">
          <span className="text-white font-semibold">{stats.successfulRefreshes} ok</span>
          {stats.failedRefreshes > 0 && (
            <span className="text-zinc-400">({stats.failedRefreshes} errors)</span>
          )}
        </div>
      </motion.div>

      {/* 2. Active Targets */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-[#181a22] p-4 rounded-2xl border border-white/10 hover:border-white/20 shadow-xl shadow-black/25 relative overflow-hidden transition-all"
      >
        <div className="flex items-center justify-between text-zinc-400 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Target Sites</span>
          <div className="w-7 h-7 rounded-xl bg-[#20232c] border border-white/10 text-white flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
            {activeTargets}
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            / {totalTargets} active
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 font-mono">
          Success rate: <strong className="text-white font-bold">{successRate}%</strong>
        </div>
      </motion.div>

      {/* 3. Latency / Response Time */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-[#181a22] p-4 rounded-2xl border border-white/10 hover:border-white/20 shadow-xl shadow-black/25 relative overflow-hidden transition-all"
      >
        <div className="flex items-center justify-between text-zinc-400 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Avg Latency</span>
          <div className="w-7 h-7 rounded-xl bg-[#20232c] border border-white/10 text-white flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
            {stats.averageLatencyMs || 0}
          </span>
          <span className="text-xs text-zinc-500 font-mono">ms</span>
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 font-mono">
          Response speed benchmark
        </div>
      </motion.div>

      {/* 4. Session Elapsed Uptime */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-[#181a22] p-4 rounded-2xl border border-white/10 hover:border-white/20 shadow-xl shadow-black/25 relative overflow-hidden transition-all"
      >
        <div className="flex items-center justify-between text-zinc-400 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Uptime Clock</span>
          <div className="w-7 h-7 rounded-xl bg-[#20232c] border border-white/10 text-white flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
          {formatTime(uptimeSeconds)}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 font-mono flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isRunning ? 'bg-white shadow-[0_0_6px_#ffffff]' : 'bg-zinc-600'
            }`}
          />
          <span className="capitalize">{runnerStatus}</span>
        </div>
      </motion.div>
    </div>
  );
};
