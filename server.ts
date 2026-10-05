import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export interface ServerLogEntry {
  id: string;
  targetId?: string;
  targetName?: string;
  timestamp: string;
  url: string;
  intervalUsed: number;
  status: 'pending' | 'success' | 'warning' | 'error';
  statusCode?: number;
  latencyMs?: number;
  message?: string;
  cacheBusterApplied: boolean;
}

export interface ServerTargetState {
  id: string;
  name: string;
  url: string;
  runnerStatus: 'idle' | 'running' | 'paused' | 'stopped';
  intervalType: 'fixed' | 'random';
  fixedSeconds: number;
  randomMinSeconds: number;
  randomMaxSeconds: number;
  refreshMode: 'dual' | 'iframe' | 'ping';
  useCacheBuster: boolean;
  maxCycles: number;
  cycleCount: number;
  nextRefreshTimestamp: number | null;
  lastRefreshAt: string | null;
  stats: {
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    averageLatencyMs: number;
    totalLatencyMs: number;
  };
  lastPing: {
    ok: boolean;
    status: number;
    statusText: string;
    latencyMs: number;
    contentType: string;
    blocksIframe: boolean;
    xFrameOptions?: string | null;
    isRailway?: boolean;
    url: string;
    timestamp: string;
    error?: string;
  } | null;
}

const STATE_FILE_PATH = path.resolve(process.cwd(), 'runner-state.json');

// Store targets in memory
const targets = new Map<string, ServerTargetState>();
const targetTimers = new Map<string, NodeJS.Timeout>();
let globalLogs: ServerLogEntry[] = [];

// Helper: Calculate next interval for a specific target
function calculateNextIntervalSeconds(target: ServerTargetState): number {
  if (target.intervalType === 'random') {
    const min = Math.max(1, Math.min(target.randomMinSeconds, target.randomMaxSeconds));
    const max = Math.max(min, Math.max(target.randomMinSeconds, target.randomMaxSeconds));
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return Math.max(1, target.fixedSeconds || 15);
}

// Persist multi-target state to disk
function persistRunnerState() {
  try {
    const dataToSave = {
      targets: Array.from(targets.values()),
      logs: globalLogs.slice(0, 80),
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(dataToSave, null, 2));
  } catch (err) {
    // Only log errors
    console.error('[Auto-Refresher Error] Failed to persist state:', err);
  }
}

// Single core ping execution for a target
async function executeTargetCycle(targetId: string) {
  const target = targets.get(targetId);
  if (!target || target.runnerStatus !== 'running' || !target.url) {
    return;
  }

  const clean = target.url.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`);
  } catch {
    console.error(`[Auto-Refresher Error] Target "${target.name}" has invalid URL: ${clean}`);
    return;
  }

  // Construct fetch URL with cache buster if enabled
  const fetchUrl = new URL(parsedUrl.toString());
  if (target.useCacheBuster) {
    fetchUrl.searchParams.set('_keepalive_cb', Date.now().toString());
  }

  const startTime = performance.now();
  let statusCode = 500;
  let statusText = 'Error';
  let isOk = false;
  let latencyMs = 0;
  let xFrameOptions: string | null = null;
  let blocksIframe = false;
  let isRailway = false;
  let errorDetail: string | undefined = undefined;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(fetchUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (KeepAlive-MultiPinger)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    }).finally(() => clearTimeout(timeoutId));

    latencyMs = Math.round(performance.now() - startTime);
    statusCode = response.status;
    statusText = response.statusText || (response.ok ? 'OK' : 'Error');
    isOk = response.ok;

    xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy') || '';
    const serverHeader = response.headers.get('server') || '';
    isRailway = parsedUrl.hostname.endsWith('railway.app') ||
                serverHeader.toLowerCase().includes('railway') ||
                response.headers.has('x-railway-router');

    blocksIframe = Boolean(
      (xFrameOptions && ['DENY', 'SAMEORIGIN'].includes(xFrameOptions.toUpperCase())) ||
      (csp && csp.toLowerCase().includes('frame-ancestors'))
    );
  } catch (err: unknown) {
    latencyMs = Math.round(performance.now() - startTime);
    const error = err as Error;
    const isTimeout = error.name === 'AbortError';
    statusCode = isTimeout ? 408 : 502;
    statusText = isTimeout ? 'Request Timeout (15s)' : (error.message || 'Fetch Failed');
    isOk = false;
    errorDetail = error.message;

    // USER REQUIREMENT: Only log when errors happen! No 200 OK console logs!
    console.error(`[Auto-Refresher Error] ${target.name} (${parsedUrl.hostname}) failed: ${statusCode} ${statusText}`);
  }

  // Update target statistics
  target.cycleCount += 1;
  target.stats.totalRefreshes += 1;
  if (isOk) {
    target.stats.successfulRefreshes += 1;
  } else {
    target.stats.failedRefreshes += 1;
    // If not an exception, but HTTP error (4xx or 5xx), log it as an error
    if (statusCode >= 400 && !errorDetail) {
      console.error(`[Auto-Refresher Error] ${target.name} (${parsedUrl.hostname}) responded with HTTP ${statusCode} ${statusText}`);
    }
  }

  target.stats.totalLatencyMs += latencyMs;
  target.stats.averageLatencyMs = Math.round(
    target.stats.totalLatencyMs / target.stats.totalRefreshes
  );
  target.lastRefreshAt = new Date().toISOString();

  target.lastPing = {
    ok: isOk,
    status: statusCode,
    statusText,
    latencyMs,
    contentType: 'text/html',
    blocksIframe,
    xFrameOptions,
    isRailway,
    url: parsedUrl.toString(),
    timestamp: target.lastRefreshAt,
    error: errorDetail,
  };

  // Add entry to audit log
  const logEntry: ServerLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    targetId: target.id,
    targetName: target.name,
    timestamp: target.lastRefreshAt,
    url: parsedUrl.toString(),
    intervalUsed: Math.round(latencyMs / 100) / 10,
    status: isOk ? 'success' : statusCode < 400 ? 'warning' : 'error',
    statusCode,
    latencyMs,
    message: isOk ? `Refreshed successfully (${statusCode})` : `HTTP ${statusCode}: ${statusText}`,
    cacheBusterApplied: target.useCacheBuster,
  };

  globalLogs.unshift(logEntry);
  if (globalLogs.length > 100) {
    globalLogs.pop();
  }

  // Check if maxCycles limit was reached
  if (target.maxCycles > 0 && target.cycleCount >= target.maxCycles) {
    target.runnerStatus = 'stopped';
    target.nextRefreshTimestamp = null;
    clearTargetTimer(target.id);
    persistRunnerState();
    return;
  }

  // Schedule next cycle if still running
  if (target.runnerStatus === 'running') {
    const nextIntervalSec = calculateNextIntervalSeconds(target);
    logEntry.intervalUsed = nextIntervalSec;
    scheduleTargetNextCycle(target.id, nextIntervalSec);
  }

  persistRunnerState();
}

function clearTargetTimer(targetId: string) {
  const existingTimer = targetTimers.get(targetId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    targetTimers.delete(targetId);
  }
}

function scheduleTargetNextCycle(targetId: string, delaySeconds: number) {
  clearTargetTimer(targetId);
  const target = targets.get(targetId);
  if (!target) return;

  target.nextRefreshTimestamp = Date.now() + delaySeconds * 1000;
  const timer = setTimeout(() => {
    executeTargetCycle(targetId).catch((err) => {
      console.error(`[Auto-Refresher Error] Cycle exception for target ${targetId}:`, err);
    });
  }, delaySeconds * 1000);

  targetTimers.set(targetId, timer);
}

// Initialize default targets or load persisted state
function loadPersistedRunnerState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const saved = JSON.parse(raw);

      if (saved && Array.isArray(saved.targets) && saved.targets.length > 0) {
        for (const t of saved.targets) {
          targets.set(t.id, {
            ...t,
            runnerStatus: t.runnerStatus || 'idle',
            stats: t.stats || {
              totalRefreshes: 0,
              successfulRefreshes: 0,
              failedRefreshes: 0,
              averageLatencyMs: 0,
              totalLatencyMs: 0,
            },
          });

          // Resume running targets automatically
          if (t.runnerStatus === 'running' && t.url) {
            scheduleTargetNextCycle(t.id, 2);
          }
        }
      } else if (saved && saved.targetUrl) {
        // Migration from legacy single-target runner state
        const legacyTarget: ServerTargetState = {
          id: 'target-1',
          name: 'Primary Site',
          url: saved.targetUrl,
          runnerStatus: saved.runnerStatus === 'running' ? 'running' : 'idle',
          intervalType: saved.intervalType || 'random',
          fixedSeconds: saved.fixedSeconds || 15,
          randomMinSeconds: saved.randomMinSeconds || 10,
          randomMaxSeconds: saved.randomMaxSeconds || 45,
          refreshMode: saved.refreshMode || 'dual',
          useCacheBuster: Boolean(saved.useCacheBuster),
          maxCycles: 0,
          cycleCount: saved.cycleCount || 0,
          nextRefreshTimestamp: null,
          lastRefreshAt: saved.lastRefreshAt || null,
          stats: saved.stats || {
            totalRefreshes: 0,
            successfulRefreshes: 0,
            failedRefreshes: 0,
            averageLatencyMs: 0,
            totalLatencyMs: 0,
          },
          lastPing: saved.lastPing || null,
        };
        targets.set(legacyTarget.id, legacyTarget);
        if (legacyTarget.runnerStatus === 'running') {
          scheduleTargetNextCycle(legacyTarget.id, 2);
        }
      }

      if (Array.isArray(saved.logs)) {
        globalLogs = saved.logs;
      }
    }
  } catch (err) {
    console.error('[Auto-Refresher Error] Failed to load runner state:', err);
  }

  // Ensure at least one default target exists
  if (targets.size === 0) {
    const defaultTarget: ServerTargetState = {
      id: 'target-1',
      name: 'Primary Site',
      url: 'https://example.com',
      runnerStatus: 'idle',
      intervalType: 'random',
      fixedSeconds: 15,
      randomMinSeconds: 10,
      randomMaxSeconds: 45,
      refreshMode: 'dual',
      useCacheBuster: true,
      maxCycles: 0,
      cycleCount: 0,
      nextRefreshTimestamp: null,
      lastRefreshAt: null,
      stats: {
        totalRefreshes: 0,
        successfulRefreshes: 0,
        failedRefreshes: 0,
        averageLatencyMs: 0,
        totalLatencyMs: 0,
      },
      lastPing: null,
    };
    targets.set(defaultTarget.id, defaultTarget);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Load persisted states
  loadPersistedRunnerState();

  // Health endpoint for Railway, keep-alive, and monitoring
  app.all(['/api/health', '/health', '/ping'], (_req: Request, res: Response) => {
    const targetList = Array.from(targets.values());
    const runningCount = targetList.filter((t) => t.runnerStatus === 'running').length;
    res.status(200).json({
      status: 'ok',
      service: 'auto-website-refresher',
      uptime: process.uptime(),
      port: PORT,
      activeTargets: targetList.length,
      runningTargets: runningCount,
      timestamp: new Date().toISOString(),
    });
  });

  // Runner API: Get all targets & status
  app.get('/api/runner/status', (_req: Request, res: Response) => {
    const targetList = Array.from(targets.values()).map((t) => {
      const remainingSec = t.nextRefreshTimestamp
        ? Math.max(0, Math.ceil((t.nextRefreshTimestamp - Date.now()) / 1000))
        : 0;
      return {
        ...t,
        remainingSeconds: remainingSec,
      };
    });

    const totalRefreshes = targetList.reduce((acc, t) => acc + t.stats.totalRefreshes, 0);
    const successfulRefreshes = targetList.reduce((acc, t) => acc + t.stats.successfulRefreshes, 0);
    const failedRefreshes = targetList.reduce((acc, t) => acc + t.stats.failedRefreshes, 0);
    const avgLatency = targetList.length > 0
      ? Math.round(targetList.reduce((acc, t) => acc + (t.stats.averageLatencyMs || 0), 0) / targetList.length)
      : 0;

    const anyRunning = targetList.some((t) => t.runnerStatus === 'running');
    const allPaused = targetList.length > 0 && targetList.every((t) => t.runnerStatus === 'paused');

    res.json({
      targets: targetList,
      // Global overview
      runnerStatus: anyRunning ? 'running' : allPaused ? 'paused' : 'idle',
      isRunning: anyRunning,
      stats: {
        totalRefreshes,
        successfulRefreshes,
        failedRefreshes,
        averageLatencyMs: avgLatency,
      },
      logs: globalLogs,
      serverTime: Date.now(),
    });
  });

  // Runner API: Add a new target refresher
  app.post('/api/runner/targets', (req: Request, res: Response) => {
    const {
      name,
      url,
      intervalType = 'random',
      fixedSeconds = 15,
      randomMinSeconds = 10,
      randomMaxSeconds = 45,
      refreshMode = 'dual',
      useCacheBuster = true,
      maxCycles = 0,
      autoStart = false,
    } = req.body || {};

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: 'Valid URL is required' });
      return;
    }

    const newId = `target-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTarget: ServerTargetState = {
      id: newId,
      name: (name && typeof name === 'string' && name.trim()) ? name.trim() : `Refresher #${targets.size + 1}`,
      url: url.trim(),
      runnerStatus: autoStart ? 'running' : 'idle',
      intervalType: intervalType === 'fixed' ? 'fixed' : 'random',
      fixedSeconds: Number(fixedSeconds) || 15,
      randomMinSeconds: Number(randomMinSeconds) || 10,
      randomMaxSeconds: Number(randomMaxSeconds) || 45,
      refreshMode: refreshMode || 'dual',
      useCacheBuster: Boolean(useCacheBuster),
      maxCycles: Number(maxCycles) || 0,
      cycleCount: 0,
      nextRefreshTimestamp: null,
      lastRefreshAt: null,
      stats: {
        totalRefreshes: 0,
        successfulRefreshes: 0,
        failedRefreshes: 0,
        averageLatencyMs: 0,
        totalLatencyMs: 0,
      },
      lastPing: null,
    };

    targets.set(newId, newTarget);
    persistRunnerState();

    if (autoStart) {
      scheduleTargetNextCycle(newId, 1);
    }

    res.json({ success: true, target: newTarget });
  });

  // Runner API: Update a target refresher
  app.put('/api/runner/targets/:id', (req: Request, res: Response) => {
    const target = targets.get(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Target not found' });
      return;
    }

    const {
      name,
      url,
      intervalType,
      fixedSeconds,
      randomMinSeconds,
      randomMaxSeconds,
      refreshMode,
      useCacheBuster,
      maxCycles,
    } = req.body || {};

    if (name !== undefined) target.name = String(name).trim() || target.name;
    if (url !== undefined && String(url).trim()) target.url = String(url).trim();
    if (intervalType !== undefined) target.intervalType = intervalType === 'fixed' ? 'fixed' : 'random';
    if (fixedSeconds !== undefined) target.fixedSeconds = Number(fixedSeconds) || target.fixedSeconds;
    if (randomMinSeconds !== undefined) target.randomMinSeconds = Number(randomMinSeconds) || target.randomMinSeconds;
    if (randomMaxSeconds !== undefined) target.randomMaxSeconds = Number(randomMaxSeconds) || target.randomMaxSeconds;
    if (refreshMode !== undefined) target.refreshMode = refreshMode;
    if (useCacheBuster !== undefined) target.useCacheBuster = Boolean(useCacheBuster);
    if (maxCycles !== undefined) target.maxCycles = Number(maxCycles) || 0;

    persistRunnerState();
    res.json({ success: true, target });
  });

  // Runner API: Delete target refresher
  app.delete('/api/runner/targets/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    if (targets.size <= 1) {
      res.status(400).json({ error: 'Cannot delete the only refresher target. Must keep at least one.' });
      return;
    }

    clearTargetTimer(id);
    targets.delete(id);
    persistRunnerState();
    res.json({ success: true, message: 'Target removed' });
  });

  // Runner API: Start specific target
  app.post('/api/runner/targets/:id/start', (req: Request, res: Response) => {
    const target = targets.get(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Target not found' });
      return;
    }

    target.runnerStatus = 'running';
    scheduleTargetNextCycle(target.id, 1);
    persistRunnerState();
    res.json({ success: true, target });
  });

  // Runner API: Pause specific target
  app.post('/api/runner/targets/:id/pause', (req: Request, res: Response) => {
    const target = targets.get(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Target not found' });
      return;
    }

    target.runnerStatus = 'paused';
    target.nextRefreshTimestamp = null;
    clearTargetTimer(target.id);
    persistRunnerState();
    res.json({ success: true, target });
  });

  // Runner API: Stop specific target
  app.post('/api/runner/targets/:id/stop', (req: Request, res: Response) => {
    const target = targets.get(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Target not found' });
      return;
    }

    target.runnerStatus = 'stopped';
    target.nextRefreshTimestamp = null;
    clearTargetTimer(target.id);
    persistRunnerState();
    res.json({ success: true, target });
  });

  // Runner API: Instant refresh specific target
  app.post('/api/runner/targets/:id/refresh-now', (req: Request, res: Response) => {
    const target = targets.get(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Target not found' });
      return;
    }

    executeTargetCycle(target.id).catch((err) => {
      console.error(`[Auto-Refresher Error] Instant refresh failed for target ${target.id}:`, err);
    });

    res.json({ success: true, message: 'Refresh triggered' });
  });

  // Runner API: Start all targets
  app.post('/api/runner/start-all', (_req: Request, res: Response) => {
    for (const target of targets.values()) {
      if (target.url) {
        target.runnerStatus = 'running';
        scheduleTargetNextCycle(target.id, 1);
      }
    }
    persistRunnerState();
    res.json({ success: true, message: 'All targets started' });
  });

  // Runner API: Pause all targets
  app.post('/api/runner/pause-all', (_req: Request, res: Response) => {
    for (const target of targets.values()) {
      target.runnerStatus = 'paused';
      target.nextRefreshTimestamp = null;
      clearTargetTimer(target.id);
    }
    persistRunnerState();
    res.json({ success: true, message: 'All targets paused' });
  });

  // Runner API: Stop all targets
  app.post('/api/runner/stop-all', (_req: Request, res: Response) => {
    for (const target of targets.values()) {
      target.runnerStatus = 'stopped';
      target.nextRefreshTimestamp = null;
      clearTargetTimer(target.id);
    }
    persistRunnerState();
    res.json({ success: true, message: 'All targets stopped' });
  });

  // Runner API: Reset statistics & logs
  app.post('/api/runner/reset-stats', (_req: Request, res: Response) => {
    for (const target of targets.values()) {
      target.stats = {
        totalRefreshes: 0,
        successfulRefreshes: 0,
        failedRefreshes: 0,
        averageLatencyMs: 0,
        totalLatencyMs: 0,
      };
      target.cycleCount = 0;
    }
    globalLogs = [];
    persistRunnerState();
    res.json({ success: true, message: 'Stats and logs reset' });
  });

  // Manual ping endpoint (USER REQUIREMENT: NO console.log for 200 OK! Only error logging!)
  app.get('/api/ping', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).json({ error: 'URL query parameter is required' });
      return;
    }

    let parsedUrl: URL;
    try {
      const clean = targetUrl.trim();
      parsedUrl = new URL(clean.startsWith('http://') || clean.startsWith('https://') 
        ? clean 
        : `https://${clean}`);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response: globalThis.Response;
      try {
        response = await fetch(parsedUrl.toString(), {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const xFrameOptions = response.headers.get('x-frame-options');
      const csp = response.headers.get('content-security-policy') || '';
      const serverHeader = response.headers.get('server') || '';
      const isRailway = parsedUrl.hostname.endsWith('railway.app') || 
                        serverHeader.toLowerCase().includes('railway') || 
                        response.headers.has('x-railway-router');

      const blocksIframe = Boolean(
        (xFrameOptions && ['DENY', 'SAMEORIGIN'].includes(xFrameOptions.toUpperCase())) ||
        (csp && csp.toLowerCase().includes('frame-ancestors'))
      );

      // Only log if HTTP error
      if (!response.ok) {
        console.error(`[Auto-Refresher Error] Ping to ${parsedUrl.hostname} returned status ${response.status}`);
      }

      res.json({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
        latencyMs,
        contentType: response.headers.get('content-type') || 'unknown',
        blocksIframe,
        xFrameOptions: xFrameOptions || null,
        isRailway,
        url: parsedUrl.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      const error = err as Error;
      const isTimeout = error.name === 'AbortError';

      // Log errors
      console.error(`[Auto-Refresher Error] Ping failed for ${parsedUrl.hostname}: ${error.message}`);

      res.status(200).json({
        ok: false,
        status: isTimeout ? 408 : 502,
        statusText: isTimeout ? 'Request Timeout (15s)' : (error.message || 'Network Fetch Failed'),
        latencyMs,
        contentType: 'none',
        blocksIframe: false,
        url: parsedUrl.toString(),
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    app.get('/', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    // Clean single startup announcement
    console.log(`Auto Website Refresher engine ready on http://0.0.0.0:${PORT}`);
  });
}

startServer();
