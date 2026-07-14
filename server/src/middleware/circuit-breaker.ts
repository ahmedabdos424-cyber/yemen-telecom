/**
 * Circuit Breaker Middleware
 * Prevents cascading failures by tracking downstream service health.
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
 */
import { logger } from '../logger';

interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitorWindowMs: number;
}

const defaults: CircuitBreakerOptions = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000,
  monitorWindowMs: 60000,
};

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private successCount = 0;
  private readonly name: string;
  private readonly opts: CircuitBreakerOptions;

  constructor(name: string, opts?: Partial<CircuitBreakerOptions>) {
    this.name = name;
    this.opts = { ...defaults, ...opts };
  }

  canExecute(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.opts.recoveryTimeoutMs) {
        this.state = 'half_open';
        this.successCount = 0;
        logger.info(`[CIRCUIT] ${this.name} → half_open (testing recovery)`);
        return true;
      }
      return false;
    }

    return true; // half_open allows execution
  }

  recordSuccess(): void {
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'closed';
        this.failures = 0;
        logger.info(`[CIRCUIT] ${this.name} → closed (recovered)`);
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half_open') {
      this.state = 'open';
      logger.warn(`[CIRCUIT] ${this.name} → open (recovery failed)`);
    } else if (this.failures >= this.opts.failureThreshold) {
      this.state = 'open';
      logger.warn(`[CIRCUIT] ${this.name} → open (${this.failures} failures in ${this.opts.monitorWindowMs}ms window)`);
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, opts?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, opts));
  }
  return breakers.get(name)!;
}

export function circuitBreakerMiddleware(serviceName: string) {
  const breaker = getCircuitBreaker(serviceName);

  return (req: any, res: any, next: any) => {
    if (!breaker.canExecute()) {
      logger.warn(`[CIRCUIT] Request blocked by circuit breaker: ${serviceName}`);
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        circuit: 'open',
        service: serviceName,
        retryAfter: Math.ceil(30 / 1000),
      });
    }

    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      if (res.statusCode >= 500) {
        breaker.recordFailure();
      } else {
        breaker.recordSuccess();
      }
      return originalEnd.apply(this, args);
    };

    next();
  };
}

export function getCircuitBreakerStatus() {
  const status: Record<string, any> = {};
  breakers.forEach((breaker, name) => {
    status[name] = breaker.getState();
  });
  return status;
}
