/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { RefresherCard } from './components/RefresherCard';
import { TargetModal } from './components/TargetModal';
import { MetricsCards } from './components/MetricsCards';
import { LiveFrame } from './components/LiveFrame';
import { ActivityLog } from './components/ActivityLog';
import { RailwayDeployModal } from './components/RailwayDeployModal';
import { RefresherTarget, RefreshLogEntry, SessionStats, RunnerStatus } from './types';
import { playRefreshChime } from './utils/audio';
import {
  Plus,
  Play,
  Pause,
  Square,
  RefreshCw,
  LayoutGrid,
  Eye,
  Terminal,
  Shield,
  Layers,
  Sparkles,
  Server,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_TARGETS = 'auto_refresher_targets_v2';
const LOCAL_STORAGE_SOUND = 'auto_refresher_sound_v2';

export default function App() {
  // Targets state: default with 2 initial sites to showcase multi-refresher capability immediately
  const [targets, setTargets] = useState<RefresherTarget[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TARGETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return [
      {
        id: 'target-1',
        name: 'Primary Web Service',
        url: 'https://example.com',
        runnerStatus: 'idle',
        intervalType: 'random',
        fixedSeconds: 15,
        randomMinSeconds: 10,
        randomMaxSeconds: 45,
        useCacheBuster: true,
        refreshMode: 'dual',
        maxCycles: 0,
        cycleCount: 0,
        remainingSeconds: 30,
        totalIntervalSeconds: 30,
        nextRefreshTimestamp: null,
        lastRefreshAt: null,
        stats: {
          totalRefreshes: 0,
          successfulRefreshes: 0,
          failedRefreshes: 0,
          averageLatencyMs: 0,
        },
        lastPing: null,
      },
      {
        id: 'target-2',
        name: 'API Keep-Alive Node',
        url: 'https://httpbin.org/get',
        runnerStatus: 'idle',
        intervalType: 'random',
        fixedSeconds: 20,
        randomMinSeconds: 15,
        randomMaxSeconds: 40,
        useCacheBuster: true,
        refreshMode: 'ping',
        maxCycles: 0,
        cycleCount: 0,
        remainingSeconds: 25,
        totalIntervalSeconds: 25,
        nextRefreshTimestamp: null,
        lastRefreshAt: null,
        stats: {
          totalRefreshes: 0,
          successfulRefreshes: 0,
          failedRefreshes: 0,
          averageLatencyMs: 0,
        },
        lastPing: null,
      },
    ];
  });

  const [selectedTargetId, setSelectedTargetId] = useState<string>('target-1');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem(LOCAL_STORAGE_SOUND) === 'true';
  });

  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [logs, setLogs] = useState<RefreshLogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(1);
  const [isRefreshingFrame, setIsRefreshingFrame] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'split' | 'preview' | 'logs'>('split');

  // Modals state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState<boolean>(false);
  const [targetToEdit, setTargetToEdit] = useState<RefresherTarget | null>(null);
  const [isRailwayModalOpen, setIsRailwayModalOpen] = useState<boolean>(false);

  // References to prevent race conditions
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const isRefreshingFrameRef = useRef(isRefreshingFrame);
  isRefreshingFrameRef.current = isRefreshingFrame;

  // Active target for LiveFrame preview
  const activePreviewTarget = targets.find((t) => t.id === selectedTargetId) || targets[0];

  // Global runner status
  const anyRunning = targets.some((t) => t.runnerStatus === 'running');
  const allPaused = targets.length > 0 && targets.every((t) => t.runnerStatus === 'paused');
  const globalRunnerStatus: RunnerStatus = anyRunning ? 'running' : allPaused ? 'paused' : 'idle';

  // Overall aggregate stats
  const aggregateStats: SessionStats = {
    totalRefreshes: targets.reduce((sum, t) => sum + t.stats.totalRefreshes, 0),
    successfulRefreshes: targets.reduce((sum, t) => sum + t.stats.successfulRefreshes, 0),
    failedRefreshes: targets.reduce((sum, t) => sum + t.stats.failedRefreshes, 0),
    averageLatencyMs: targets.length > 0
      ? Math.round(targets.reduce((sum, t) => sum + t.stats.averageLatencyMs, 0) / targets.length)
      : 0,
    startedAt: null,
    lastRefreshedAt: null,
  };

  // Sync state with server background runner
  const syncRunnerStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/runner/status');
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data.targets) && data.targets.length > 0) {
        setTargets((prevTargets) => {
          return data.targets.map((serverTarget: any) => {
            const local = prevTargets.find((t) => t.id === serverTarget.id);
            return {
              ...serverTarget,
              name: serverTarget.name || local?.name || 'Site Refresher',
              remainingSeconds: serverTarget.remainingSeconds !== undefined
                ? serverTarget.remainingSeconds
                : local?.remainingSeconds || 30,
              totalIntervalSeconds: local?.totalIntervalSeconds || 30,
            };
          });
        });
      }

      if (Array.isArray(data.logs)) {
        setLogs(
          data.logs.map((item: any) => ({
            id: item.id,
            targetId: item.targetId,
            targetName: item.targetName,
            timestamp: new Date(item.timestamp),
            url: item.url,
            intervalUsed: item.intervalUsed,
            status: item.status,
            statusCode: item.statusCode,
            latencyMs: item.latencyMs,
            message: item.message,
            cacheBusterApplied: item.cacheBusterApplied,
          }))
        );
      }
    } catch {
      // Ignore background poll errors silently
    }
  }, []);

  // Initial sync & periodic heartbeat sync with 24/7 background runner
  useEffect(() => {
    syncRunnerStatus();

    const pollTimer = setInterval(() => {
      syncRunnerStatus();
    }, 2500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncRunnerStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [syncRunnerStatus]);

  // Persist targets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TARGETS, JSON.stringify(targets));
    } catch {
      // Ignore
    }
  }, [targets]);

  // Uptime ticker
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [anyRunning]);

  // Client countdown ticker for smooth second-by-second updates
  useEffect(() => {
    const ticker = setInterval(() => {
      setTargets((prevTargets) => {
        let changed = false;
        const now = Date.now();
        const updated = prevTargets.map((t) => {
          if (t.runnerStatus !== 'running' || !t.nextRefreshTimestamp) {
            return t;
          }
          const remMs = t.nextRefreshTimestamp - now;
          const remSec = Math.max(0, parseFloat((remMs / 1000).toFixed(1)));
          if (remSec !== t.remainingSeconds) {
            changed = true;
            return { ...t, remainingSeconds: remSec };
          }
          return t;
        });
        return changed ? updated : prevTargets;
      });
    }, 200);

    return () => clearInterval(ticker);
  }, []);

  // Handle Add or Edit Target
  const handleSaveTarget = async (data: {
    id?: string;
    name: string;
    url: string;
    intervalType: any;
    fixedSeconds: number;
    randomMinSeconds: number;
    randomMaxSeconds: number;
    refreshMode: any;
    useCacheBuster: boolean;
    maxCycles: number;
    autoStart: boolean;
  }) => {
    if (data.id) {
      // Update existing target
      try {
        await fetch(`/api/runner/targets/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.error('Failed to update target on server:', err);
      }

      setTargets((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, ...data } : t))
      );
    } else {
      // Create new target
      try {
        const res = await fetch('/api/runner/targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.target) {
            setTargets((prev) => [
              ...prev,
              {
                ...resData.target,
                remainingSeconds: resData.target.fixedSeconds || 30,
                totalIntervalSeconds: resData.target.fixedSeconds || 30,
              },
            ]);
            setSelectedTargetId(resData.target.id);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to create target on server:', err);
      }

      // Fallback local creation
      const newId = `target-${Date.now()}`;
      const newTarget: RefresherTarget = {
        id: newId,
        name: data.name,
        url: data.url,
        runnerStatus: data.autoStart ? 'running' : 'idle',
        intervalType: data.intervalType,
        fixedSeconds: data.fixedSeconds,
        randomMinSeconds: data.randomMinSeconds,
        randomMaxSeconds: data.randomMaxSeconds,
        refreshMode: data.refreshMode,
        useCacheBuster: data.useCacheBuster,
        maxCycles: data.maxCycles,
        cycleCount: 0,
        remainingSeconds: data.fixedSeconds,
        totalIntervalSeconds: data.fixedSeconds,
        nextRefreshTimestamp: data.autoStart ? Date.now() + 2000 : null,
        lastRefreshAt: null,
        stats: {
          totalRefreshes: 0,
          successfulRefreshes: 0,
          failedRefreshes: 0,
          averageLatencyMs: 0,
        },
        lastPing: null,
      };
      setTargets((prev) => [...prev, newTarget]);
      setSelectedTargetId(newId);
    }
  };

  // Delete Target
  const handleDeleteTarget = async (id: string) => {
    if (targets.length <= 1) return;
    try {
      await fetch(`/api/runner/targets/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete target on server:', err);
    }

    setTargets((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (selectedTargetId === id && remaining.length > 0) {
        setSelectedTargetId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Target Single Actions: Start, Pause, Stop, Refresh Now
  const handleStartTarget = async (id: string) => {
    try {
      await fetch(`/api/runner/targets/${id}/start`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to start target on server:', err);
    }

    setTargets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              runnerStatus: 'running',
              nextRefreshTimestamp: Date.now() + 2000,
            }
          : t
      )
    );
  };

  const handlePauseTarget = async (id: string) => {
    try {
      await fetch(`/api/runner/targets/${id}/pause`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to pause target on server:', err);
    }

    setTargets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              runnerStatus: 'paused',
              nextRefreshTimestamp: null,
            }
          : t
      )
    );
  };

  const handleStopTarget = async (id: string) => {
    try {
      await fetch(`/api/runner/targets/${id}/stop`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to stop target on server:', err);
    }

    setTargets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              runnerStatus: 'stopped',
              nextRefreshTimestamp: null,
            }
          : t
      )
    );
  };

  const handleInstantRefreshTarget = async (id: string) => {
    const target = targets.find((t) => t.id === id);
    if (!target) return;

    if (soundEnabled) {
      playRefreshChime();
    }

    if (id === selectedTargetId) {
      setIsRefreshingFrame(true);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setIsRefreshingFrame(false), 500);
    }

    try {
      await fetch(`/api/runner/targets/${id}/refresh-now`, { method: 'POST' });
      // Trigger instant poll to update ping status
      setTimeout(syncRunnerStatus, 300);
    } catch (err) {
      console.error('Instant refresh failed:', err);
    }
  };

  // Master Global Actions
  const handleStartAll = async () => {
    try {
      await fetch('/api/runner/start-all', { method: 'POST' });
    } catch (err) {
      console.error('Start all failed:', err);
    }

    setTargets((prev) =>
      prev.map((t) => ({
        ...t,
        runnerStatus: 'running',
        nextRefreshTimestamp: Date.now() + 2000,
      }))
    );
  };

  const handlePauseAll = async () => {
    try {
      await fetch('/api/runner/pause-all', { method: 'POST' });
    } catch (err) {
      console.error('Pause all failed:', err);
    }

    setTargets((prev) =>
      prev.map((t) => ({
        ...t,
        runnerStatus: 'paused',
        nextRefreshTimestamp: null,
      }))
    );
  };

  const handleStopAll = async () => {
    try {
      await fetch('/api/runner/stop-all', { method: 'POST' });
    } catch (err) {
      console.error('Stop all failed:', err);
    }

    setTargets((prev) =>
      prev.map((t) => ({
        ...t,
        runnerStatus: 'stopped',
        nextRefreshTimestamp: null,
      }))
    );
  };

  const handleResetStats = async () => {
    try {
      await fetch('/api/runner/reset-stats', { method: 'POST' });
    } catch (err) {
      console.error('Reset stats failed:', err);
    }

    setTargets((prev) =>
      prev.map((t) => ({
        ...t,
        cycleCount: 0,
        stats: {
          totalRefreshes: 0,
          successfulRefreshes: 0,
          failedRefreshes: 0,
          averageLatencyMs: 0,
        },
      }))
    );
    setLogs([]);
    setUptimeSeconds(0);
  };

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem(LOCAL_STORAGE_SOUND, String(nextVal));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (anyRunning) {
          handlePauseAll();
        } else {
          handleStartAll();
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleStopAll();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (activePreviewTarget) {
          handleInstantRefreshTarget(activePreviewTarget.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anyRunning, activePreviewTarget]);

  return (
    <div className="min-h-screen bg-[#121316] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black relative">
      {/* Soft eye-pleasing ambient lighting */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.04),transparent_70%)] pointer-events-none z-0" />
      {/* Square box background grid */}
      <div className="fixed inset-0 bg-grid-squares pointer-events-none z-0 opacity-60" />

      {/* Top Navbar */}
      <div className="relative z-30">
        <Navbar
          runnerStatus={globalRunnerStatus}
          onStartAll={handleStartAll}
          onStopAll={handleStopAll}
          onPauseAll={handlePauseAll}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onOpenRailwayModal={() => setIsRailwayModalOpen(true)}
          onOpenAddModal={() => {
            setTargetToEdit(null);
            setIsTargetModalOpen(true);
          }}
          uptimeSeconds={uptimeSeconds}
          activeTargetCount={targets.filter((t) => t.runnerStatus === 'running').length}
          totalTargetCount={targets.length}
        />
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Big Gradient Head Text & Hero Section */}
        <section className="text-center sm:text-left py-4 sm:py-6 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gradient-white">
              Multi-Site Auto Refresher
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-2xl font-mono">
              Keep multiple websites and APIs awake 24/7 with randomized intervals (10-45s), live sandboxes, and zero-downtime background pings.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTargetToEdit(null);
                setIsTargetModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold btn-glow-white"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Site Refresher</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleResetStats}
              className="p-2.5 rounded-xl text-xs bg-zinc-900 text-zinc-400 hover:text-white border border-white/10 hover:border-white/30 transition-all"
              title="Reset session counters"
            >
              <RotateCcw className="w-4 h-4" />
            </motion.button>
          </div>
        </section>

        {/* Global Telemetry Metrics Cards */}
        <MetricsCards
          stats={aggregateStats}
          uptimeSeconds={uptimeSeconds}
          runnerStatus={globalRunnerStatus}
          totalTargets={targets.length}
          activeTargets={targets.filter((t) => t.runnerStatus === 'running').length}
        />

        {/* Multi-Refresher Targets Grid */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-white" />
              <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">
                Configured Site Refreshers ({targets.length})
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              {!anyRunning ? (
                <button
                  type="button"
                  onClick={handleStartAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold btn-glow-white"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start All ({targets.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold btn-glow-dark"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause All</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {targets.map((target) => (
                <RefresherCard
                  key={target.id}
                  target={target}
                  isSelectedForPreview={target.id === selectedTargetId}
                  onSelectForPreview={() => setSelectedTargetId(target.id)}
                  onStart={() => handleStartTarget(target.id)}
                  onPause={() => handlePauseTarget(target.id)}
                  onStop={() => handleStopTarget(target.id)}
                  onInstantRefresh={() => handleInstantRefreshTarget(target.id)}
                  onEdit={() => {
                    setTargetToEdit(target);
                    setIsTargetModalOpen(true);
                  }}
                  onDelete={() => handleDeleteTarget(target.id)}
                  canDelete={targets.length > 1}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* View Layout Tabs & Keyboard Hints */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-white/10 shadow-sm text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView('split')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'split' ? 'bg-white text-black font-bold glow-white-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('preview')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'preview' ? 'bg-white text-black font-bold glow-white-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'logs' ? 'bg-white text-black font-bold glow-white-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Activity & Errors</span>
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-white/20 text-white font-mono text-[10px]">
                Space
              </kbd>
              <span>Toggle All</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-white/20 text-white font-mono text-[10px]">
                R
              </kbd>
              <span>Refresh Active</span>
            </span>
          </div>
        </div>

        {/* Live Preview / Activity Logs Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {(activeView === 'split' || activeView === 'preview') && (
            <div className={activeView === 'split' ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <LiveFrame
                url={activePreviewTarget?.url || ''}
                name={activePreviewTarget?.name}
                refreshKey={refreshKey}
                isLoading={isRefreshingFrame}
                onManualRefresh={() => {
                  if (activePreviewTarget) {
                    handleInstantRefreshTarget(activePreviewTarget.id);
                  }
                }}
                lastPing={activePreviewTarget?.lastPing || null}
                mode={activePreviewTarget?.refreshMode || 'dual'}
              />
            </div>
          )}

          {(activeView === 'split' || activeView === 'logs') && (
            <div className={activeView === 'split' ? 'lg:col-span-4' : 'lg:col-span-12'}>
              <ActivityLog
                logs={logs}
                onClearLogs={() => setLogs([])}
                targetNames={targets.map((t) => ({ id: t.id, name: t.name }))}
              />
            </div>
          )}
        </div>
      </main>

      {/* Target Modal (Add / Edit) */}
      <TargetModal
        isOpen={isTargetModalOpen}
        onClose={() => {
          setIsTargetModalOpen(false);
          setTargetToEdit(null);
        }}
        onSave={handleSaveTarget}
        targetToEdit={targetToEdit}
      />

      {/* Railway Deployment Guide Modal */}
      <RailwayDeployModal
        isOpen={isRailwayModalOpen}
        onClose={() => setIsRailwayModalOpen(false)}
      />
    </div>
  );
}
