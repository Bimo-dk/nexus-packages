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
    if (this.policy.max_attempts > 0 && this.attemptCount >= this.policy.max_attempts) return;

    const base = this.policy.initial_delay_ms * Math.pow(this.policy.backoff_multiplier, this.attemptCount);
    const jitter = this.policy.jitter_ms > 0 ? Math.random() * this.policy.jitter_ms : 0;
    const delay = Math.min(base + jitter, this.policy.max_delay_ms);

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
