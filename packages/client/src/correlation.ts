/**
 * Genererer per-session og per-request correlation IDs. Universal — virker i både
 * Node.js og browser via globalThis.crypto.
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

/** Returnerer stabil session-ID (samme i hele processens/sidens levetid). */
export function getSessionId(): string {
  if (sessionIdCache === null) {
    sessionIdCache = makeSessionId();
  }
  return sessionIdCache;
}

/** Returnerer nyt request-ID i form sessionId-counter. */
export function nextRequestId(): string {
  requestCounter++;
  return `${getSessionId()}-${requestCounter}`;
}
