import React from 'react';
import { RefreshCw, Volume2, VolumeX, Terminal, Play, Square, Pause, Plus, Layers } from 'lucide-react';
import { RunnerStatus } from '../types';
import { motion } from 'motion/react';

interface NavbarProps {
  runnerStatus: RunnerStatus;
  onStartAll: () => void;
  onStopAll: () => void;
  onPauseAll: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRailwayModal: () => void;
  onOpenAddModal: () => void;
  uptimeSeconds: number;
  activeTargetCount: number;
  totalTargetCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  runnerStatus,
  onStartAll,
  onStopAll,
  onPauseAll,
  soundEnabled,
  onToggleSound,
  onOpenRailwayModal,
  onOpenAddModal,
  uptimeSeconds,
  activeTargetCount,
  totalTargetCount,
}) => {
  const isRunning = runnerStatus === 'running';
  const isPaused = runnerStatus === 'paused';

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="border-b border-white/10 bg-[#121316]/90 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold glow-white-sm shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`}
              style={{ animationDuration: '3s' }}
            />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Auto Refresher</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border border-white/20 text-zinc-300 bg-white/5 hidden xs:inline-block">
                  Pro
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate">
              Multi-site keep-alive engine & 24/7 background pinger
            </p>
          </div>
        </div>

        {/* Center Status Pill (Desktop & Tablet) */}
        <div className="hidden md:flex items-center gap-2.5 bg-zinc-900/90 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-300 shadow-sm">
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <motion.span
                animate={{ scale: [1, 2.2, 1], opacity: [0.9, 0, 0.9] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inline-flex h-full w-full rounded-full bg-white"
              />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isRunning
                  ? 'bg-white shadow-[0_0_8px_#ffffff]'
                  : isPaused
                  ? 'bg-zinc-400'
                  : 'bg-zinc-600'
              }`}
            />
          </span>

          <span className="font-semibold text-white">
            {isRunning ? 'Running' : isPaused ? 'Paused' : 'Standby'}
          </span>

          <span className="text-zinc-500 font-mono text-[11px] border-l border-white/10 pl-2">
            {activeTargetCount}/{totalTargetCount} active
          </span>

          {(isRunning || isPaused) && uptimeSeconds > 0 && (
            <span className="text-zinc-400 font-mono text-[11px] border-l border-white/10 pl-2">
              {formatUptime(uptimeSeconds)}
            </span>
          )}
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Add Site Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold btn-glow-white"
            title="Add a new website refresher target"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Add Site</span>
          </motion.button>

          {/* Quick Start All / Pause / Stop All */}
          {!isRunning ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartAll}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold btn-glow-dark"
              title="Start auto-refreshing all targets"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start All</span>
            </motion.button>
          ) : (
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPauseAll}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold btn-glow-dark"
                title="Pause all active target countdowns"
              >
                <Pause className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Pause</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStopAll}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-white/10"
                title="Stop all refreshers"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Stop</span>
              </motion.button>
            </div>
          )}

          {/* Sound Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute sound notification' : 'Enable audio chime on refresh'}
            className={`p-1.5 sm:p-2 rounded-lg text-xs transition-colors border ${
              soundEnabled
                ? 'bg-white text-black border-white glow-white-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border-white/10'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </motion.button>

          {/* Railway Modal */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenRailwayModal}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/15 transition-all shadow-xs"
            title="Railway web url configuration & deploy guide"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline">Railway</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
