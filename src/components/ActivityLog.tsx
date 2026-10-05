import React, { useState } from 'react';
import { ListFilter, Trash2, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Copy, Check, Filter } from 'lucide-react';
import { RefreshLogEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityLogProps {
  logs: RefreshLogEntry[];
  onClearLogs: () => void;
  targetNames?: { id: string; name: string }[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onClearLogs, targetNames = [] }) => {
  // Default to 'all' but provide prominent 'errors' option as requested
  const [filter, setFilter] = useState<'all' | 'errors' | 'success'>('all');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const filteredLogs = logs.filter((log) => {
    // Target filter
    if (selectedTargetId !== 'all' && log.targetId && log.targetId !== selectedTargetId) {
      return false;
    }
    // Status filter
    if (filter === 'errors') {
      return log.status === 'error' || log.status === 'warning' || (log.statusCode && log.statusCode >= 400);
    }
    if (filter === 'success') {
      return log.status === 'success' || (log.statusCode && log.statusCode >= 200 && log.statusCode < 300);
    }
    return true;
  });

  const errorCount = logs.filter(
    (l) => l.status === 'error' || l.status === 'warning' || (l.statusCode && l.statusCode >= 400)
  ).length;

  const copyLogsToClipboard = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${formatTime(l.timestamp)}] ${l.targetName || 'Target'}: Status ${l.statusCode || l.status} | Latency: ${l.latencyMs || 0}ms | ${l.url} | ${l.message || ''}`
      )
      .join('\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (entry: RefreshLogEntry) => {
    const isError = entry.status === 'error' || (entry.statusCode && entry.statusCode >= 400);
    const isWarning = entry.status === 'warning';

    if (isError) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-black font-mono">
          <XCircle className="w-3 h-3 stroke-[2.5]" />
          <span>{entry.statusCode || 500} ERR</span>
        </span>
      );
    }

    if (isWarning) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-800 text-zinc-200 border border-white/20 font-mono">
          <AlertTriangle className="w-3 h-3" />
          <span>{entry.statusCode || 'Notice'}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-900 text-zinc-300 border border-white/10 font-mono">
        <CheckCircle2 className="w-3 h-3 text-white" />
        <span>{entry.statusCode || 200} OK</span>
      </span>
    );
  };

  return (
    <div className="bg-[#181a22] rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-5 flex flex-col h-full max-h-[500px] transition-all">
      {/* Header with Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white tracking-tight">Audit & Activity Log</h3>
          <span className="text-xs bg-[#20232c] text-zinc-300 font-mono font-bold px-2 py-0.5 rounded-full border border-white/10">
            {logs.length}
          </span>
          {errorCount > 0 && (
            <span className="text-xs bg-white text-[#121316] font-mono font-bold px-2 py-0.5 rounded-full">
              {errorCount} errors
            </span>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#20232c] p-0.5 rounded-lg border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              filter === 'all' ? 'bg-white text-[#121316] glow-white-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({logs.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('errors')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
              filter === 'errors'
                ? 'bg-white text-[#121316] glow-white-sm'
                : errorCount > 0
                ? 'text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Errors Only</span>
            {errorCount > 0 && (
              <span className={`px-1 py-0.1 rounded text-[10px] ${filter === 'errors' ? 'bg-[#121316] text-white' : 'bg-white text-[#121316] font-bold'}`}>
                {errorCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('success')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              filter === 'success' ? 'bg-white text-[#121316] glow-white-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Success
          </button>
        </div>

        {/* Target Selector (if > 1 target) */}
        {targetNames.length > 1 && (
          <select
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className="px-2.5 py-1 bg-[#20232c] border border-white/10 rounded-lg text-xs font-mono text-zinc-300 focus:outline-hidden focus:border-white"
          >
            <option value="all">All Targets</option>
            {targetNames.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        {/* Export / Clear buttons */}
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button
                type="button"
                onClick={copyLogsToClipboard}
                className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#20232c] hover:bg-[#282b36] border border-white/10"
                title="Copy log to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={onClearLogs}
                className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#20232c] hover:bg-[#282b36] border border-white/10"
                title="Clear all recorded entries"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Log Feed */}
      {filteredLogs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
          <p className="text-xs font-mono">
            {logs.length === 0
              ? 'No refresh events recorded yet. Start refreshers to begin monitoring.'
              : filter === 'errors'
              ? 'No errors detected! All refresh pings are responding with HTTP 200 OK.'
              : 'No log events match the active filter.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
          <AnimatePresence initial={false}>
            {filteredLogs.map((log) => {
              const isErr = log.status === 'error' || (log.statusCode && log.statusCode >= 400);
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`border rounded-xl p-2.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isErr
                      ? 'bg-[#242733] border-white/40 shadow-xs'
                      : 'bg-[#13151b] hover:bg-[#1c1f28] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-zinc-500 shrink-0 text-[11px] font-mono">{formatTime(log.timestamp)}</span>
                    {getStatusBadge(log)}
                    {log.targetName && (
                      <span className="text-[11px] font-bold text-zinc-200 bg-[#20232c] px-1.5 py-0.5 rounded border border-white/10 truncate">
                        {log.targetName}
                      </span>
                    )}
                    <span className="text-zinc-300 truncate font-mono text-xs" title={log.url}>
                      {log.url}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-zinc-400 font-mono">
                    {log.message && isErr && (
                      <span className="text-white font-semibold truncate max-w-[160px]" title={log.message}>
                        {log.message}
                      </span>
                    )}
                    {log.latencyMs !== undefined && (
                      <span className="bg-[#121316] px-2 py-0.5 rounded-md border border-white/10 text-white font-bold">
                        {log.latencyMs}ms
                      </span>
                    )}
                    <span className="text-zinc-500">
                      wait: <strong className="text-white">{log.intervalUsed}s</strong>
                    </span>
                    {log.cacheBusterApplied && (
                      <span className="text-white flex items-center" title="Cache Buster enabled">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
