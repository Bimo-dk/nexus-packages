import type { ReconnectPolicy } from '@bimo-dk/nexus-core';

/**
 * Drives exponential-backoff reconnect logic from a ReconnectPolicy.
 * Replaces hardcoded backoff in older adapters.
 */
export class ReconnectManager {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attemptCount = 0;
  private stopped = false;

  constructor(
    private readonly connect: () => void | Promise<void>,
    private policy: ReconnectPolicy,
  ) {}

  updatePolicy(policy: ReconnectPolicy): void {
    this.policy = policy;
  }

  /** Call on clean disconnect. Starts the reconnect cycle. */
  scheduleReconnect(): void {
    if (this.stopped || this.timer !== null) return;
    if (this.policy.maxAttempts > 0 && this.attemptCount >= this.policy.maxAttempts) return;

    const base = this.policy.initialDelayMs * Math.pow(this.policy.backoffMultiplier, this.attemptCount);
    const jitter = this.policy.jitterMs > 0 ? Math.random() * this.policy.jitterMs : 0;
    const delay = Math.min(base + jitter, this.policy.maxDelayMs);

    this.timer = setTimeout(async () => {
      this.timer = null;
      this.attemptCount++;
      try {
        await this.connect();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  /** Call on successful connection to reset the backoff counter. */
  onConnected(): void {
    this.attemptCount = 0;
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  resume(): void {
    this.stopped = false;
  }
}
