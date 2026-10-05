import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ShieldAlert,
  CheckCircle,
  Smartphone,
  Tablet,
  Monitor,
  Check,
} from 'lucide-react';
import { PingResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LiveFrameProps {
  url: string;
  name?: string;
  refreshKey: number;
  isLoading: boolean;
  onManualRefresh: () => void;
  lastPing: PingResult | null;
  mode: 'dual' | 'iframe' | 'ping';
}

type DeviceView = 'full' | 'tablet' | 'mobile';

export const LiveFrame: React.FC<LiveFrameProps> = ({
  url,
  name,
  refreshKey,
  isLoading,
  onManualRefresh,
  lastPing,
  mode,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [deviceView, setDeviceView] = useState<DeviceView>('full');
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanUrl = url ? url.trim() : '';
  const normalizedUrl = cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('about:')
    ? `https://${cleanUrl}`
    : cleanUrl;
  const displayUrl = normalizedUrl || 'about:blank';
  const blocksIframe = lastPing?.blocksIframe || iframeError;

  useEffect(() => {
    setIframeError(false);
  }, [url]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getDeviceFrameStyles = () => {
    if (deviceView === 'mobile') {
      return 'w-full max-w-[375px] h-[96%] rounded-2xl border-2 border-white/20 shadow-2xl shadow-black/80 overflow-hidden relative my-auto';
    }
    if (deviceView === 'tablet') {
      return 'w-full max-w-[768px] h-[96%] rounded-xl border border-white/20 shadow-2xl shadow-black/80 overflow-hidden relative my-auto';
    }
    return 'w-full h-full relative overflow-hidden';
  };

  return (
    <div
      ref={containerRef}
      className={`bg-[#181a22] rounded-2xl border border-white/10 shadow-2xl shadow-black/35 overflow-hidden flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : 'h-[480px] sm:h-[560px] lg:h-[620px] max-h-[82vh] w-full'
      }`}
    >
      {/* Browser Chrome Header */}
      <div className="bg-[#13151b] border-b border-white/10 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 shrink-0 overflow-hidden">
        {/* Left: Window controls and Status indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block" />
          </div>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#20232c] text-white border border-white/20 shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-white animate-ping' : 'bg-white'}`} />
            <span>{isLoading ? 'Refreshing Target Website...' : 'Live Preview'}</span>
          </span>
        </div>

        {/* Device View Mode Switcher */}
        <div className="hidden md:flex items-center bg-[#20232c] p-0.5 rounded-lg text-xs border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setDeviceView('full')}
            className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              deviceView === 'full' ? 'bg-white text-[#121316] font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
            title="Desktop view"
          >
            <Monitor className="w-3 h-3" />
            <span className="text-[11px]">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('tablet')}
            className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              deviceView === 'tablet' ? 'bg-white text-[#121316] font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
            title="Tablet view (768px)"
          >
            <Tablet className="w-3 h-3" />
            <span className="text-[11px]">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              deviceView === 'mobile' ? 'bg-white text-[#121316] font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
            title="Mobile view (375px)"
          >
            <Smartphone className="w-3 h-3" />
            <span className="text-[11px]">Mobile</span>
          </button>
        </div>

        {/* Address bar */}
        <div className="flex-1 min-w-0 max-w-sm lg:max-w-md mx-1 sm:mx-2 flex items-center bg-[#20232c] border border-white/10 rounded-lg px-2 sm:px-3 py-1 text-xs text-zinc-300 font-mono shadow-xs overflow-hidden">
          <span className="text-zinc-500 mr-1.5 text-[11px] shrink-0 font-mono">https://</span>
          <span className="truncate flex-1 min-w-0 text-white font-medium" title={url || 'No URL configured'}>
            {isLoading ? (
              <span className="text-white font-bold animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 text-white animate-spin shrink-0" />
                Refreshing Target Website...
              </span>
            ) : cleanUrl ? (
              cleanUrl.replace(/^https?:\/\//, '')
            ) : (
              'No target selected'
            )}
          </span>
          {isLoading && (
            <span className="text-[10px] font-mono text-zinc-400 ml-1.5 shrink-0 uppercase tracking-wider font-bold">
              SYNC
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
          <div className="hidden sm:flex items-center">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 25))}
              className="p-1 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="text-[10px] font-mono px-1 py-0.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(150, prev + 25))}
              className="p-1 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={onManualRefresh}
            className="p-1 sm:p-1.5 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            title="Reload Preview Frame"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-white' : ''}`} />
          </button>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="p-1 sm:p-1.5 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              title="Open Target in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 sm:p-1.5 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Frame Sandbox or Fallback */}
      <div className="relative flex-1 bg-[#101217] overflow-hidden flex items-center justify-center p-1 sm:p-2 bg-grid-squares-dense">
        {!cleanUrl ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
            <RefreshCw className="w-10 h-10 mb-3 text-zinc-700" />
            <h3 className="text-sm font-bold text-white mb-1">No Refresher Target Selected</h3>
            <p className="text-xs max-w-sm text-zinc-500">
              Select or add a site refresher to preview and keep it alive in real time.
            </p>
          </div>
        ) : mode === 'ping' ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-[#181a22] rounded-2xl border border-white/15 shadow-2xl m-4">
            <div className="w-12 h-12 rounded-2xl bg-white text-[#121316] flex items-center justify-center mb-3 glow-white-sm">
              <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Server Keep-Alive (Ping Mode)</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed font-mono">
              HTTP requests are dispatched directly from the server to keep{' '}
              <span className="text-white font-semibold">{url}</span> awake with zero client overhead.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-glow-dark"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Website Directly</span>
            </a>
          </div>
        ) : blocksIframe ? (
          <div className="flex flex-col items-center justify-center p-6 text-center bg-[#181a22] rounded-2xl border border-white/15 shadow-2xl max-w-lg m-4">
            <div className="w-12 h-12 rounded-2xl bg-[#20232c] text-white border border-white/20 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Iframe Embedding Restricted by Target</h3>
            <p className="text-xs text-zinc-400 max-w-md mb-3 leading-relaxed">
              <span className="text-white font-mono">{url}</span> sends security headers (
              <code className="text-zinc-300">X-Frame-Options: {lastPing?.xFrameOptions || 'DENY'}</code> or CSP) preventing browser frame embedding.
            </p>
            <div className="bg-[#12141a] border border-white/15 text-zinc-200 rounded-xl p-3 text-xs w-full mb-4 text-left">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-white">
                <Check className="w-3.5 h-3.5" />
                <span>Keep-Alive Auto-Refresher Is Active</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                The background HTTP runner continuously pings this service 24/7 on the server to prevent cold starts and keep instances alive.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold btn-glow-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Window</span>
              </a>
              <button
                type="button"
                onClick={() => setIframeError(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-950 border border-white/10 hover:border-white/30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className={`transition-all duration-200 flex items-center justify-center ${getDeviceFrameStyles()}`}>
            <div
              className="w-full h-full bg-white transition-transform duration-200 overflow-hidden flex flex-col"
              style={{
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
                transformOrigin: 'top center',
                width: zoomLevel !== 100 ? `${(100 / (zoomLevel / 100))}%` : '100%',
                height: zoomLevel !== 100 ? `${(100 / (zoomLevel / 100))}%` : '100%',
              }}
            >
              <iframe
                key={`frame-${refreshKey}`}
                id="live-refresher-frame"
                src={displayUrl}
                title="Target Website Sandbox"
                className="w-full h-full border-0 bg-white block flex-1"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                onError={() => setIframeError(true)}
              />
            </div>
          </div>
        )}

        {/* Loading Flash Animation Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#101217]/75 backdrop-blur-[2px] pointer-events-none flex items-center justify-center z-30"
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-[#181a22] px-6 py-3.5 rounded-2xl shadow-2xl border border-white/40 flex items-center gap-3 text-sm font-extrabold text-white glow-white-md"
              >
                <RefreshCw className="w-5 h-5 text-white animate-spin stroke-[2.5]" />
                <span className="tracking-tight">Refreshing Target Website...</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
