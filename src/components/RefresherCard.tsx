import React from 'react';
import {
  Play,
  Square,
  Pause,
  RefreshCw,
  ExternalLink,
  Eye,
  Settings2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Server,
  Layers,
  ShieldCheck,
  Clock,
  Activity,
} from 'lucide-react';
import { RefresherTarget } from '../types';
import { motion } from 'motion/react';

interface RefresherCardProps {
  target: RefresherTarget;
  isSelectedForPreview: boolean;
  isRefreshing?: boolean;
  onSelectForPreview: () => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onInstantRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const RefresherCard: React.FC<RefresherCardProps> = ({
  target,
  isSelectedForPreview,
  isRefreshing = false,
  onSelectForPreview,
  onStart,
  onPause,
  onStop,
  onInstantRefresh,
  onEdit,
  onDelete,
  canDelete,
}) => {
  const isRunning = target.runnerStatus === 'running';
  const isPaused = target.runnerStatus === 'paused';

  const totalSec = target.totalIntervalSeconds || (target.intervalType === 'random' ? 30 : target.fixedSeconds);
  const remainingSec = target.remainingSeconds !== undefined ? target.remainingSeconds : totalSec;
  const progressPercent = totalSec > 0
    ? Math.max(0, Math.min(100, ((totalSec - remainingSec) / totalSec) * 100))
    : 0;

  const isRailway = target.url.toLowerCase().includes('railway.app');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border transition-all relative overflow-hidden bg-[#181a22] ${
        isRefreshing
          ? 'border-white shadow-[0_0_24px_rgba(255,255,255,0.25)] ring-1 ring-white/50'
          : isSelectedForPreview
          ? 'border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.12)]'
          : 'border-white/10 hover:border-white/25 shadow-lg shadow-black/30'
      }`}
    >
      {/* Top row: Status indicator, Name, Target Actions */}
      <div className="p-4 sm:p-5 pb-3 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="relative flex h-2 w-2 shrink-0">
                {(isRunning || isRefreshing) && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isRefreshing || isRunning
                      ? 'bg-white shadow-[0_0_8px_#ffffff]'
                      : isPaused
                      ? 'bg-zinc-400'
                      : 'bg-zinc-600'
                  }`}
                />
              </span>

              <h3 className="font-bold text-sm text-white truncate tracking-tight" title={target.name}>
                {target.name}
              </h3>

              {isRefreshing ? (
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white text-[#121316] font-bold flex items-center gap-1 shadow-[0_0_12px_#ffffff]">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Refreshing target website...
                </span>
              ) : isRunning ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#20232c] text-white border border-white/20 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Refreshing target website
                </span>
              ) : isPaused ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181a22] text-zinc-400 border border-white/10">
                  Paused
                </span>
              ) : null}

              {isRailway && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#13151b] border border-white/20 text-zinc-300">
                  Railway
                </span>
              )}

              {isSelectedForPreview && !isRefreshing && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20 font-medium">
                  Preview Active
                </span>
              )}
            </div>

            {/* URL link */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <span className="truncate max-w-[280px] sm:max-w-md" title={target.url}>
                {target.url}
              </span>
              <a
                href={target.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-zinc-500 hover:text-white transition-colors shrink-0"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onSelectForPreview}
              className={`p-1.5 rounded-lg text-xs transition-colors border ${
                isSelectedForPreview
                  ? 'bg-white text-[#121316] border-white'
                  : 'bg-[#20232c] text-zinc-400 hover:text-white border-white/10 hover:border-white/30'
              }`}
              title="Preview this site in the live frame"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded-lg text-xs bg-[#20232c] text-zinc-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
              title="Edit refresher settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-lg text-xs bg-[#20232c] text-zinc-500 hover:text-white hover:bg-zinc-800 border border-white/10 transition-colors"
                title="Delete this refresher target"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body: Countdown Progress & Telemetry */}
      <div className="p-4 sm:p-5 pt-3.5 space-y-3.5">
        {/* Prominent banner when actively refreshing target website */}
        {isRefreshing && (
          <div className="bg-white text-[#121316] text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 glow-white-md animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" />
            <span>Refreshing target website...</span>
          </div>
        )}

        {/* Progress Bar & Countdown Number */}
        <div className="bg-[#12141a] p-3 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-300" />
              <span className="font-mono">
                {target.intervalType === 'random'
                  ? `Random ${target.randomMinSeconds}-${target.randomMaxSeconds}s`
                  : `Fixed ${target.fixedSeconds}s`}
              </span>
            </div>

            <div className="font-mono font-bold text-white text-sm">
              {isRefreshing ? (
                <span className="text-white text-xs font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Refreshing target website...
                </span>
              ) : isRunning ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] text-zinc-400 font-normal font-sans">Next:</span>
                  <span>{Math.max(0, remainingSec).toFixed(1)}s</span>
                </span>
              ) : isPaused ? (
                'Paused'
              ) : (
                'Standby'
              )}
            </div>
          </div>

          {/* Smooth progress bar */}
          <div className="w-full bg-[#20232c] rounded-full h-1.5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all ${
                isRefreshing
                  ? 'bg-white shadow-[0_0_12px_#ffffff] animate-pulse w-full'
                  : isRunning
                  ? 'bg-white shadow-[0_0_8px_#ffffff]'
                  : 'bg-zinc-600'
              }`}
              style={{ width: isRefreshing ? '100%' : `${isRunning ? progressPercent : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-0.5">
            <span>Mode: {target.refreshMode.toUpperCase()}</span>
            <span>
              {target.useCacheBuster && (
                <span className="inline-flex items-center gap-1 text-zinc-400">
                  <ShieldCheck className="w-3 h-3 text-white" />
                  Cache Buster
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Telemetry Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#14161e] border border-white/5 rounded-xl p-2">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">Cycles</span>
            <span className="font-mono font-bold text-white text-sm">{target.stats.totalRefreshes}</span>
          </div>

          <div className="bg-[#14161e] border border-white/5 rounded-xl p-2">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">Status</span>
            <span className="font-mono font-bold text-white text-xs truncate block">
              {target.lastPing ? (
                target.lastPing.ok ? (
                  <span className="text-white flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {target.lastPing.status}
                  </span>
                ) : (
                  <span className="text-zinc-300 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {target.lastPing.status || 'Err'}
                  </span>
                )
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="bg-[#14161e] border border-white/5 rounded-xl p-2">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">Latency</span>
            <span className="font-mono font-bold text-white text-sm">
              {target.lastPing?.latencyMs ? `${target.lastPing.latencyMs}ms` : '—'}
            </span>
          </div>
        </div>

        {/* Action Controls for this specific target */}
        <div className="flex items-center gap-2 pt-1">
          {!isRunning ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold btn-glow-white"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </motion.button>
          ) : (
            <div className="flex-1 flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPause}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-semibold btn-glow-dark"
                title="Pause countdown"
              >
                <Pause className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStop}
                className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold bg-[#20232c] text-zinc-300 hover:text-white border border-white/10"
                title="Stop countdown"
              >
                <Square className="w-3 h-3 fill-current" />
              </motion.button>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onInstantRefresh}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#20232c] hover:bg-[#282b36] text-white border border-white/15 transition-all shadow-xs"
            title="Execute immediate refresh ping"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh Now</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
