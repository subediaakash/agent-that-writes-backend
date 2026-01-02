/* Minimal logging utility */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level?: LogLevel;
  enabled?: boolean;
}

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = 'info';

class Logger {
  private level: LogLevel;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? DEFAULT_LEVEL;
    this.enabled = options.enabled ?? true;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return LEVEL_WEIGHTS[level] >= LEVEL_WEIGHTS[this.level];
  }

  private format(level: LogLevel, message: unknown, meta?: unknown): string {
    const ts = new Date().toISOString();
    const base = `[${ts}] [${level.toUpperCase()}]`;
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    if (meta === undefined) return `${base} ${msg}`;
    const metaStr = typeof meta === 'string' ? meta : JSON.stringify(meta);
    return `${base} ${msg} ${metaStr}`;
  }

  debug(message: unknown, meta?: unknown) {
    if (!this.shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug(this.format('debug', message, meta));
  }

  info(message: unknown, meta?: unknown) {
    if (!this.shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.info(this.format('info', message, meta));
  }

  warn(message: unknown, meta?: unknown) {
    if (!this.shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(this.format('warn', message, meta));
  }

  error(message: unknown, meta?: unknown) {
    if (!this.shouldLog('error')) return;
    // eslint-disable-next-line no-console
    console.error(this.format('error', message, meta));
  }
}

const logger = new Logger();

export default logger;
