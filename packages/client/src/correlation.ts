/**
 * Generates per-session and per-request correlation IDs. Universal — works in both
 * Node.js and browser via globalThis.crypto.
 */

let sessionIdCache: string | null = null;
let requestCounter = 0;

function makeSessionId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID().substring(0, 8);
  }
  return Math.random().toString(36).substring(2, 10);
}

/** Returns a stable session ID (same for the entire process/page lifetime). */
export function getSessionId(): string {
  if (sessionIdCache === null) {
    sessionIdCache = makeSessionId();
  }
  return sessionIdCache;
}

/** Returns a new request ID in the form sessionId-counter. */
export function nextRequestId(): string {
  requestCounter++;
  return `${getSessionId()}-${requestCounter}`;
}
