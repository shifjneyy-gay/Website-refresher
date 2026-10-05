import React, { useState } from 'react';
import { X, Check, Copy, Terminal, ExternalLink, ShieldCheck, Cpu, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface RailwayDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RailwayDeployModal: React.FC<RailwayDeployModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<{ status: string; ok: boolean; latency?: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTestUrl = async () => {
    if (!testUrl.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ping?url=${encodeURIComponent(testUrl.trim())}`);
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        status: `${data.status} ${data.statusText || ''}`,
        latency: data.latencyMs,
      });
    } catch {
      setTestResult({ ok: false, status: 'Connection error' });
    } finally {
      setIsTesting(false);
    }
  };

  const steps = [
    {
      title: '1. Push / Connect to Railway',
      detail: 'Deploy via GitHub repository or Railway CLI. This codebase contains a Node 22 build, Dockerfile, nixpacks.toml, and an Express 24/7 background runner.',
      code: 'railway up  (or push to GitHub)',
    },
    {
      title: '2. Generate Domain / Public Web URL',
      detail: 'In Railway Dashboard: Open your Project → Select Service → Settings tab → scroll to "Networking" → Click "Generate Domain" to get your https://*.up.railway.app URL.',
      code: 'Railway Dashboard → Settings → Networking → "Generate Domain"',
    },
    {
      title: '3. Zero Config Needed for PORT',
      detail: 'Railway automatically sets process.env.PORT. The server automatically binds to 0.0.0.0 and process.env.PORT.',
      code: 'PORT: Dynamically assigned by Railway container',
    },
    {
      title: '4. Healthcheck Endpoint',
      detail: 'Under Railway Service Settings → Networking → Healthcheck Path, set:',
      code: '/api/health',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#181a22] rounded-2xl border border-white/15 shadow-2xl max-w-xl w-full overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="bg-[#13151b] text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#121316] font-bold flex items-center justify-center glow-white-sm">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Railway 24/7 Deployment Guide</h3>
              <p className="text-xs text-zinc-400">Keep unlimited websites awake and prevent container sleep</p>
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

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Key fix banner */}
          <div className="bg-[#12141a] border border-white/20 rounded-xl p-3.5 text-xs text-zinc-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5 text-white">24/7 Background Keep-Alive on Railway</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                When deployed on Railway, the Express server executes background pings for all configured target sites continuously, even without any active browser sessions.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.title} className="bg-[#13151b] border border-white/10 rounded-xl p-3.5 text-xs">
                <div className="font-bold text-white mb-1">{step.title}</div>
                <p className="text-zinc-400 mb-2 leading-relaxed">{step.detail}</p>
                <div className="flex items-center justify-between bg-[#12141a] border border-white/10 text-white px-3 py-2 rounded-lg font-mono text-[11px]">
                  <span className="truncate mr-2 text-zinc-300">{step.code}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(step.code, idx)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors shrink-0"
                    title="Copy snippet"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test URL in-app */}
          <div className="bg-[#13151b] rounded-xl p-3.5 border border-white/10 text-xs space-y-2">
            <span className="font-bold text-white block text-xs">
              Test Any Live Web URL
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://your-service.up.railway.app"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#12141a] border border-white/15 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white font-mono"
              />
              <button
                type="button"
                onClick={handleTestUrl}
                disabled={isTesting || !testUrl.trim()}
                className="px-4 py-2 bg-white text-[#121316] rounded-lg font-bold hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 glow-white-sm"
              >
                {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Ping'}
              </button>
            </div>
            {testResult && (
              <div className="p-2 rounded-lg text-[11px] font-mono flex items-center justify-between border bg-[#12141a] border-white/20 text-white">
                <span>Result: {testResult.status}</span>
                {testResult.latency !== undefined && <span>{testResult.latency}ms</span>}
              </div>
            )}
          </div>

          {/* Deployment Specs */}
          <div className="bg-[#13151b] rounded-xl p-3.5 border border-white/10 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-white" />
              Railway Environment Specs
            </div>
            <div className="grid grid-cols-2 gap-2 text-zinc-300 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 block text-[10px]">Node Version</span>
                <span className="text-white font-semibold">Node 22 (LTS)</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Host & Port</span>
                <span className="text-white font-semibold">0.0.0.0:$PORT</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Build Command</span>
                <span className="text-white font-semibold">npm run build</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Health Check</span>
                <span className="text-white font-semibold">/api/health</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black border-t border-white/10 flex items-center justify-between">
          <a
            href="https://railway.app/dashboard"
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-zinc-300 hover:text-white font-semibold flex items-center gap-1"
          >
            <span>Open Railway Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold btn-glow-white"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
