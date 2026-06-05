/**
 * Typed error class for all errors coming from the registry API.
 *
 * Thrown by RegistryClient in @bimo-dk/nexus-client. Consumers can do:
 *   try { await client.getRemotes(); }
 *   catch (err) { if (err instanceof RegistryError) { ... } }
 */
export class RegistryError extends Error {
  public readonly statusCode: number;
  public readonly correlationId?: string;

  constructor(message: string, statusCode: number, correlationId?: string) {
    super(message);
    this.name = 'RegistryError';
    this.statusCode = statusCode;
    this.correlationId = correlationId;
    // Preserve correct prototype chain (important for instanceof in ES5 targets)
    Object.setPrototypeOf(this, RegistryError.prototype);
  }

  toJSON(): { name: string; message: string; statusCode: number; correlationId?: string } {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      correlationId: this.correlationId,
    };
  }
}

/**
 * Extended error with a machine-readable errorCode for platform-level failures
 * like IP bans, rate limiting, and connection limits.
 *
 * Common codes: ip_banned, rate_limited, too_many_connections
 */
export class NexusError extends RegistryError {
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string, correlationId?: string) {
    super(message, statusCode, correlationId);
    this.name = 'NexusError';
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, NexusError.prototype);
  }

  toJSON(): { name: string; message: string; statusCode: number; errorCode: string; correlationId?: string } {
    return {
      ...super.toJSON(),
      errorCode: this.errorCode,
    };
  }
}
