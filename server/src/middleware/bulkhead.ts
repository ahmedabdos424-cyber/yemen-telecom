/**
 * Bulkhead Isolation Middleware
 * Limits concurrent requests to prevent resource exhaustion.
 * Inspired by the Bulkhead pattern from resilience engineering.
 */
import { logger } from '../logger';

interface BulkheadOptions {
  maxConcurrent: number;
  maxQueue: number;
  queueTimeoutMs: number;
}

const defaults: BulkheadOptions = {
  maxConcurrent: 50,
  maxQueue: 100,
  queueTimeoutMs: 10000,
};

class Bulkhead {
  private running = 0;
  private queued = 0;
  private readonly name: string;
  private readonly opts: BulkheadOptions;
  private readonly waitQueue: Array<{ resolve: () => void; timer: NodeJS.Timeout }> = [];

  constructor(name: string, opts?: Partial<BulkheadOptions>) {
    this.name = name;
    this.opts = { ...defaults, ...opts };
  }

  async acquire(): Promise<boolean> {
    if (this.running < this.opts.maxConcurrent) {
      this.running++;
      return true;
    }

    if (this.queued >= this.opts.maxQueue) {
      logger.warn(`[BULKHEAD] ${this.name}: rejected (queue full: ${this.queued}/${this.opts.maxQueue})`);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      this.queued++;
      const timer = setTimeout(() => {
        this.queued--;
        const idx = this.waitQueue.findIndex((w) => w.timer === timer);
        if (idx !== -1) this.waitQueue.splice(idx, 1);
        logger.warn(`[BULKHEAD] ${this.name}: queue timeout`);
        resolve(false);
      }, this.opts.queueTimeoutMs);

      this.waitQueue.push({
        resolve: () => {
          clearTimeout(timer);
          this.queued--;
          this.running++;
          resolve(true);
        },
        timer,
      });
    });
  }

  release(): void {
    this.running--;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      next.resolve();
    }
  }

  getStatus() {
    return {
      name: this.name,
      running: this.running,
      queued: this.queued,
      maxConcurrent: this.opts.maxConcurrent,
      maxQueue: this.opts.maxQueue,
    };
  }
}

const bulkheads = new Map<string, Bulkhead>();

export function getBulkhead(name: string, opts?: Partial<BulkheadOptions>): Bulkhead {
  if (!bulkheads.has(name)) {
    bulkheads.set(name, new Bulkhead(name, opts));
  }
  return bulkheads.get(name)!;
}

export function bulkheadMiddleware(name: string, opts?: Partial<BulkheadOptions>) {
  const bulkhead = getBulkhead(name, opts);

  return async (req: any, res: any, next: any) => {
    const acquired = await bulkhead.acquire();
    if (!acquired) {
      return res.status(429).json({
        error: 'Too many concurrent requests',
        bulkhead: name,
        retryAfter: 5,
      });
    }

    res.on('finish', () => bulkhead.release());
    res.on('close', () => bulkhead.release());

    next();
  };
}

export function getBulkheadStatus() {
  const status: Record<string, any> = {};
  bulkheads.forEach((bulkhead, name) => {
    status[name] = bulkhead.getStatus();
  });
  return status;
}
