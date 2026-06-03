/**
 * Typed fejlklasse for alle fejl der kommer fra registry API.
 *
 * Kastes af RegistryClient i @bimo-dk/nexus-client. Konsumenter kan gøre:
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
    // Bevarer korrekt prototype-chain (vigtigt for instanceof i ES5-targets)
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
