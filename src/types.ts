export type RefreshMode = 'dual' | 'iframe' | 'ping';

export type IntervalType = 'fixed' | 'random';

export type RunnerStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface RefresherTarget {
  id: string;
  name: string;
  url: string;
  runnerStatus: RunnerStatus;
  intervalType: IntervalType;
  fixedSeconds: number; // e.g. 15
  randomMinSeconds: number; // e.g. 10
  randomMaxSeconds: number; // e.g. 45
  useCacheBuster: boolean;
  refreshMode: RefreshMode;
  maxCycles: number; // 0 = continuous
  cycleCount: number;
  remainingSeconds: number;
  totalIntervalSeconds: number;
  nextRefreshTimestamp: number | null;
  lastRefreshAt: string | null;
  stats: {
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    averageLatencyMs: number;
  };
  lastPing: PingResult | null;
}

export interface RefreshConfig {
  url: string;
  intervalType: IntervalType;
  fixedSeconds: number; // e.g. 10, 15, 30, 45, 60...
  randomMinSeconds: number; // e.g. 10
  randomMaxSeconds: number; // e.g. 45
  useCacheBuster: boolean;
  soundNotification: boolean;
  refreshMode: RefreshMode;
  autoStartOnUrlChange: boolean;
  maxCycles: number; // 0 = continuous, or 10, 25, 50, 100
}

export interface PingResult {
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
}

export interface RefreshLogEntry {
  id: string;
  targetId?: string;
  targetName?: string;
  timestamp: Date;
  url: string;
  intervalUsed: number;
  status: 'pending' | 'success' | 'warning' | 'error';
  statusCode?: number;
  latencyMs?: number;
  message?: string;
  cacheBusterApplied: boolean;
}

export interface SessionStats {
  totalRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  averageLatencyMs: number;
  startedAt: Date | null;
  lastRefreshedAt: Date | null;
}
