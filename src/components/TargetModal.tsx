import React, { useState, useEffect } from 'react';
import { X, Globe, Clock, Shuffle, Shield, Layers, Zap, Server, Check } from 'lucide-react';
import { RefresherTarget, IntervalType, RefreshMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (targetData: {
    id?: string;
    name: string;
    url: string;
    intervalType: IntervalType;
    fixedSeconds: number;
    randomMinSeconds: number;
    randomMaxSeconds: number;
    refreshMode: RefreshMode;
    useCacheBuster: boolean;
    maxCycles: number;
    autoStart: boolean;
  }) => void;
  targetToEdit?: RefresherTarget | null;
}

const PRESET_INTERVALS = [10, 15, 20, 30, 45, 60, 120];

export const TargetModal: React.FC<TargetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  targetToEdit,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalType, setIntervalType] = useState<IntervalType>('random');
  const [fixedSeconds, setFixedSeconds] = useState(15);
  const [randomMinSeconds, setRandomMinSeconds] = useState(10);
  const [randomMaxSeconds, setRandomMaxSeconds] = useState(45);
  const [refreshMode, setRefreshMode] = useState<RefreshMode>('dual');
  const [useCacheBuster, setUseCacheBuster] = useState(true);
  const [maxCycles, setMaxCycles] = useState(0);
  const [autoStart, setAutoStart] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (targetToEdit) {
      setName(targetToEdit.name);
      setUrl(targetToEdit.url);
      setIntervalType(targetToEdit.intervalType);
      setFixedSeconds(targetToEdit.fixedSeconds);
      setRandomMinSeconds(targetToEdit.randomMinSeconds);
      setRandomMaxSeconds(targetToEdit.randomMaxSeconds);
      setRefreshMode(targetToEdit.refreshMode);
      setUseCacheBuster(targetToEdit.useCacheBuster);
      setMaxCycles(targetToEdit.maxCycles || 0);
      setAutoStart(targetToEdit.runnerStatus === 'running');
    } else {
      setName('');
      setUrl('');
      setIntervalType('random');
      setFixedSeconds(15);
      setRandomMinSeconds(10);
      setRandomMaxSeconds(45);
      setRefreshMode('dual');
      setUseCacheBuster(true);
      setMaxCycles(0);
      setAutoStart(true);
    }
    setErrorMsg('');
  }, [targetToEdit, isOpen]);

  if (!isOpen) return null;

  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    // Never move the other bar: clamp val strictly to at most randomMaxSeconds - 1
    const safeMax = Math.max(5, randomMaxSeconds - 1);
    setRandomMinSeconds(Math.min(val, safeMax));
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    // Never move the other bar: clamp val strictly to at least randomMinSeconds + 1
    const safeMin = Math.min(120, randomMinSeconds + 1);
    setRandomMaxSeconds(Math.max(val, safeMin));
  };

  const stepMin = (delta: number) => {
    setRandomMinSeconds((prev) => {
      const next = prev + delta;
      return Math.max(5, Math.min(next, randomMaxSeconds - 1));
    });
  };

  const stepMax = (delta: number) => {
    setRandomMaxSeconds((prev) => {
      const next = prev + delta;
      return Math.min(120, Math.max(next, randomMinSeconds + 1));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanUrl = url.trim();
    if (!cleanUrl) {
      setErrorMsg('Target URL is required');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setErrorMsg('Please enter a valid website URL (e.g. example.com or https://my-app.up.railway.app)');
      return;
    }

    const defaultName = cleanUrl.replace(/^https?:\/\//, '').split('/')[0];
    const finalName = name.trim() || defaultName;

    onSave({
      id: targetToEdit?.id,
      name: finalName,
      url: cleanUrl,
      intervalType,
      fixedSeconds,
      randomMinSeconds,
      randomMaxSeconds,
      refreshMode,
      useCacheBuster,
      maxCycles,
      autoStart,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#181a22] border border-white/15 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#13151b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#121316] flex items-center justify-center glow-white-sm font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {targetToEdit ? 'Configure Refresher' : 'Add New Site Refresher'}
              </h3>
              <p className="text-xs text-zinc-400">
                Setup unlimited independent website refreshers & keep-alive targets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#20232c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#20232c] border border-white/30 text-white text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Website Name & URL */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Target Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Production API or Portfolio Site"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-white transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Target Website URL *
              </label>
              <input
                type="text"
                placeholder="e.g. https://my-app.up.railway.app or example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-white transition-all font-mono"
              />
            </div>
          </div>

          {/* Interval Configuration */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Refresh Timing
              </label>

              {/* Mode switch */}
              <div className="flex items-center bg-[#12141a] p-0.5 rounded-lg border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setIntervalType('random')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    intervalType === 'random' ? 'bg-white text-[#121316] glow-white-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Random (10-45s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIntervalType('fixed')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    intervalType === 'fixed' ? 'bg-white text-[#121316] glow-white-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Fixed</span>
                </button>
              </div>
            </div>

            {intervalType === 'random' ? (
              <div className="bg-[#12141a] border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="text-xs text-zinc-300">
                  Refreshes with human-like randomized delay between <strong className="text-white">{randomMinSeconds}s</strong> and <strong className="text-white">{randomMaxSeconds}s</strong>.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-zinc-400 font-mono">Min Delay:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => stepMin(-1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-[#20232c] text-zinc-300 hover:text-white border border-white/10 text-xs font-mono"
                          title="Decrease 1s"
                        >
                          -
                        </button>
                        <span className="text-[11px] text-white font-mono font-bold bg-[#20232c] px-2 py-0.5 rounded border border-white/10 min-w-8 text-center">
                          {randomMinSeconds}s
                        </span>
                        <button
                          type="button"
                          onClick={() => stepMin(1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-[#20232c] text-zinc-300 hover:text-white border border-white/10 text-xs font-mono"
                          title="Increase 1s"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={Math.max(5, randomMaxSeconds - 1)}
                      value={Math.min(randomMinSeconds, Math.max(5, randomMaxSeconds - 1))}
                      onChange={handleMinSliderChange}
                      className="w-full accent-white h-1.5 bg-[#20232c] rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>5s</span>
                      <span>{randomMaxSeconds - 1}s max</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-zinc-400 font-mono">Max Delay:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => stepMax(-1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-[#20232c] text-zinc-300 hover:text-white border border-white/10 text-xs font-mono"
                          title="Decrease 1s"
                        >
                          -
                        </button>
                        <span className="text-[11px] text-white font-mono font-bold bg-[#20232c] px-2 py-0.5 rounded border border-white/10 min-w-8 text-center">
                          {randomMaxSeconds}s
                        </span>
                        <button
                          type="button"
                          onClick={() => stepMax(1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-[#20232c] text-zinc-300 hover:text-white border border-white/10 text-xs font-mono"
                          title="Increase 1s"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={Math.min(120, randomMinSeconds + 1)}
                      max={120}
                      value={Math.max(randomMaxSeconds, Math.min(120, randomMinSeconds + 1))}
                      onChange={handleMaxSliderChange}
                      className="w-full accent-white h-1.5 bg-[#20232c] rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>{randomMinSeconds + 1}s min</span>
                      <span>120s</span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets without jitter */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-zinc-500 text-[11px] font-mono">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRandomMinSeconds(10);
                      setRandomMaxSeconds(45);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                      randomMinSeconds === 10 && randomMaxSeconds === 45
                        ? 'bg-white text-[#121316] font-bold border-white'
                        : 'bg-[#20232c] text-zinc-300 hover:text-white border-white/10'
                    }`}
                  >
                    10s–45s (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRandomMinSeconds(15);
                      setRandomMaxSeconds(30);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                      randomMinSeconds === 15 && randomMaxSeconds === 30
                        ? 'bg-white text-[#121316] font-bold border-white'
                        : 'bg-[#20232c] text-zinc-300 hover:text-white border-white/10'
                    }`}
                  >
                    15s–30s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRandomMinSeconds(30);
                      setRandomMaxSeconds(60);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                      randomMinSeconds === 30 && randomMaxSeconds === 60
                        ? 'bg-white text-[#121316] font-bold border-white'
                        : 'bg-[#20232c] text-zinc-300 hover:text-white border-white/10'
                    }`}
                  >
                    30s–60s
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#12141a] border border-white/10 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_INTERVALS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setFixedSeconds(sec)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                        fixedSeconds === sec
                          ? 'bg-white text-[#121316] border-white glow-white-sm'
                          : 'bg-[#20232c] text-zinc-300 hover:text-white border-white/10'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-zinc-400 font-mono">Exact duration (seconds):</span>
                  <input
                    type="number"
                    min="3"
                    max="3600"
                    value={fixedSeconds}
                    onChange={(e) => setFixedSeconds(Math.max(3, Number(e.target.value)))}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold bg-[#12141a] text-white border border-white/20 rounded-lg text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mode & Cache Buster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Refresh Mode
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#12141a] p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setRefreshMode('dual')}
                  className={`py-1 rounded-lg font-semibold transition-all ${
                    refreshMode === 'dual' ? 'bg-white text-[#121316]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Dual
                </button>
                <button
                  type="button"
                  onClick={() => setRefreshMode('iframe')}
                  className={`py-1 rounded-lg font-semibold transition-all ${
                    refreshMode === 'iframe' ? 'bg-white text-[#121316]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Frame
                </button>
                <button
                  type="button"
                  onClick={() => setRefreshMode('ping')}
                  className={`py-1 rounded-lg font-semibold transition-all ${
                    refreshMode === 'ping' ? 'bg-white text-[#121316]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Ping
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Cache Buster
              </label>
              <button
                type="button"
                onClick={() => setUseCacheBuster(!useCacheBuster)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                  useCacheBuster
                    ? 'bg-[#12141a] border-white text-white'
                    : 'bg-[#12141a] border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <span>Bypass HTTP Caches</span>
                {useCacheBuster ? <Check className="w-4 h-4 text-white" /> : <span className="text-[10px] text-zinc-600">OFF</span>}
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-[#20232c] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold btn-glow-white"
            >
              {targetToEdit ? 'Save Changes' : 'Add Refresher'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
