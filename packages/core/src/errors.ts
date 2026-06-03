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
