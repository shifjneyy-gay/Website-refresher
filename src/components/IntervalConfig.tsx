import React, { useState } from 'react';
import { Clock, Shuffle, Sliders, Timer, Sparkles, AlertCircle, Hash } from 'lucide-react';
import { RefreshConfig } from '../types';
import { motion } from 'motion/react';

interface IntervalConfigProps {
  config: RefreshConfig;
  onChangeConfig: (newConfig: Partial<RefreshConfig>) => void;
  nextScheduledSeconds: number;
}

const PRESET_INTERVALS = [
  { label: '10s', seconds: 10 },
  { label: '15s', seconds: 15 },
  { label: '20s', seconds: 20 },
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
];

const CYCLE_LIMIT_OPTIONS = [
  { label: 'Continuous (∞)', value: 0 },
  { label: '10 times', value: 10 },
  { label: '25 times', value: 25 },
  { label: '50 times', value: 50 },
  { label: '100 times', value: 100 },
];

export const IntervalConfig: React.FC<IntervalConfigProps> = ({
  config,
  onChangeConfig,
  nextScheduledSeconds,
}) => {
  const [unit, setUnit] = useState<'seconds' | 'minutes'>(
    config.fixedSeconds >= 60 && config.fixedSeconds % 60 === 0 ? 'minutes' : 'seconds'
  );

  const isRandom = config.intervalType === 'random';

  const handleUnitToggle = (newUnit: 'seconds' | 'minutes') => {
    setUnit(newUnit);
  };

  const handleFixedNumberChange = (val: number) => {
    const rawVal = Math.max(1, isNaN(val) ? 10 : val);
    const inSeconds = unit === 'minutes' ? rawVal * 60 : rawVal;
    onChangeConfig({ fixedSeconds: inSeconds });
  };

  const currentFixedDisplayValue = unit === 'minutes'
    ? Math.round((config.fixedSeconds / 60) * 10) / 10
    : config.fixedSeconds;

  return (
    <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl shadow-black/20 p-4 sm:p-5 flex flex-col justify-between h-full transition-all">
      <div>
        {/* Header & Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-xs">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Refresh Timing & Limits</h2>
              <p className="text-xs text-zinc-400">Random 10 to 45 seconds or customized minutes</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-xs">
            <button
              id="interval-tab-random-btn"
              type="button"
              onClick={() => onChangeConfig({ intervalType: 'random' })}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 relative ${
                isRandom ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isRandom && (
                <motion.div
                  layoutId="interval-active-pill"
                  className="absolute inset-0 bg-zinc-800 rounded-lg shadow-xs"
                  transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <Shuffle className="w-3.5 h-3.5 text-violet-400" />
                <span>Random (10–45s)</span>
              </span>
            </button>

            <button
              id="interval-tab-fixed-btn"
              type="button"
              onClick={() => onChangeConfig({ intervalType: 'fixed' })}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 relative ${
                !isRandom ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {!isRandom && (
                <motion.div
                  layoutId="interval-active-pill"
                  className="absolute inset-0 bg-zinc-800 rounded-lg shadow-xs"
                  transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Fixed Interval</span>
              </span>
            </button>
          </div>
        </div>

        {/* Content A: Random Range (10s to 45s) */}
        {isRandom ? (
          <div className="space-y-4">
            <div className="bg-violet-950/40 border border-violet-800/50 rounded-xl p-3 sm:p-3.5 text-xs text-violet-200">
              <div className="flex items-center gap-2 font-bold mb-1 text-violet-100">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>Human-Like Randomized Interval (10s – 45s)</span>
              </div>
              <p className="text-violet-300/90 leading-relaxed">
                Refreshes at a randomized duration between <strong className="font-bold text-violet-200">{config.randomMinSeconds}s</strong> and <strong className="font-bold text-violet-200">{config.randomMaxSeconds}s</strong> every cycle without drift or stutter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Min slider */}
              <div className="space-y-1.5 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>Min Wait</span>
                  <span className="font-mono text-indigo-400">{config.randomMinSeconds}s</span>
                </div>
                <input
                  id="range-min-seconds"
                  type="range"
                  min="5"
                  max={Math.max(5, config.randomMaxSeconds - 1)}
                  value={Math.min(config.randomMinSeconds, Math.max(5, config.randomMaxSeconds - 1))}
                  onChange={(e) => {
                    const newMin = Number(e.target.value);
                    onChangeConfig({ randomMinSeconds: Math.min(newMin, Math.max(5, config.randomMaxSeconds - 1)) });
                  }}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>5s</span>
                  <span>{config.randomMaxSeconds - 1}s max</span>
                </div>
              </div>

              {/* Max slider */}
              <div className="space-y-1.5 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>Max Wait</span>
                  <span className="font-mono text-violet-400">{config.randomMaxSeconds}s</span>
                </div>
                <input
                  id="range-max-seconds"
                  type="range"
                  min={Math.min(120, config.randomMinSeconds + 1)}
                  max="120"
                  value={Math.max(config.randomMaxSeconds, Math.min(120, config.randomMinSeconds + 1))}
                  onChange={(e) => {
                    const newMax = Number(e.target.value);
                    onChangeConfig({ randomMaxSeconds: Math.max(newMax, Math.min(120, config.randomMinSeconds + 1)) });
                  }}
                  className="w-full accent-violet-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>{config.randomMinSeconds + 1}s min</span>
                  <span>120s</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-zinc-500 font-medium">Quick ranges:</span>
              <button
                type="button"
                onClick={() => onChangeConfig({ randomMinSeconds: 10, randomMaxSeconds: 45 })}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  config.randomMinSeconds === 10 && config.randomMaxSeconds === 45
                    ? 'bg-violet-600 text-white border-violet-500 shadow-xs'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 border-zinc-700/60'
                }`}
              >
                10s – 45s (Requested)
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig({ randomMinSeconds: 15, randomMaxSeconds: 30 })}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  config.randomMinSeconds === 15 && config.randomMaxSeconds === 30
                    ? 'bg-violet-600 text-white border-violet-500 shadow-xs'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 border-zinc-700/60'
                }`}
              >
                15s – 30s
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig({ randomMinSeconds: 30, randomMaxSeconds: 60 })}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  config.randomMinSeconds === 30 && config.randomMaxSeconds === 60
                    ? 'bg-violet-600 text-white border-violet-500 shadow-xs'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 border-zinc-700/60'
                }`}
              >
                30s – 60s
              </button>
            </div>
          </div>
        ) : (
          /* Content B: Fixed Interval */
          <div className="space-y-4">
            {/* Presets Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {PRESET_INTERVALS.map((preset) => {
                const isSelected = config.fixedSeconds === preset.seconds;
                return (
                  <button
                    key={preset.seconds}
                    id={`preset-${preset.label}-btn`}
                    type="button"
                    onClick={() => onChangeConfig({ fixedSeconds: preset.seconds })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs ring-2 ring-indigo-500/30'
                        : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Slider & Units */}
            <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                  Exact Interval:
                </span>

                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('seconds')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      unit === 'seconds' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Seconds
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('minutes')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      unit === 'minutes' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Minutes
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="fixed-interval-slider"
                  type="range"
                  min={unit === 'minutes' ? '1' : '5'}
                  max={unit === 'minutes' ? '60' : '300'}
                  value={currentFixedDisplayValue}
                  onChange={(e) => handleFixedNumberChange(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer flex-1"
                />

                <div className="flex items-center gap-1 min-w-[90px] justify-end">
                  <input
                    id="fixed-interval-numeric"
                    type="number"
                    min={unit === 'minutes' ? '1' : '5'}
                    max={unit === 'minutes' ? '60' : '3600'}
                    value={currentFixedDisplayValue}
                    onChange={(e) => handleFixedNumberChange(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-xs font-mono text-center font-bold bg-zinc-900 text-zinc-100 border border-zinc-750 rounded-lg focus:border-indigo-500 outline-hidden"
                  />
                  <span className="text-xs text-zinc-400 font-medium">{unit === 'minutes' ? 'min' : 'sec'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Max Cycles Limit Selector */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <Hash className="w-3.5 h-3.5 text-zinc-500" />
            <span>Stop automatically after:</span>
          </div>

          <div className="flex items-center gap-1">
            {CYCLE_LIMIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeConfig({ maxCycles: opt.value })}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                  config.maxCycles === opt.value
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 border-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <span>
          Active rule: <strong className="text-zinc-300 font-sans font-semibold">
            {isRandom
              ? `${config.randomMinSeconds}s – ${config.randomMaxSeconds}s dynamic`
              : `${config.fixedSeconds}s (${Math.round((config.fixedSeconds / 60) * 10) / 10}m)`}
          </strong>
        </span>
        <span className="text-indigo-400 font-semibold">
          Target cycle: {nextScheduledSeconds}s
        </span>
      </div>
    </div>
  );
};
