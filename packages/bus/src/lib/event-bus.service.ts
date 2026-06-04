import { Injectable } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import type {
  NexusEvent,
  NexusRequest,
  NexusResponse,
  PublishOptions,
  RequestHandler,
  RequestOptions,
} from './event-bus.types';

const RESPONSE_TOPIC_PREFIX = '__nexus_response__:';

function makeId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Convert a topic pattern like `cart:*` or `auth:**` into a RegExp.
 * `*` matches a single segment (no colons), `**` matches across segments.
 * Plain topic (no wildcards) requires exact match.
 */
function topicMatcher(pattern: string): (topic: string) => boolean {
  if (!pattern.includes('*')) {
    return (t) => t === pattern;
  }
  const re = new RegExp(
    '^' +
      pattern
        .split('**').map((p) => p.split('*').map(escapeRe).join('[^:]*'))
        .join('.*') +
      '$',
  );
  return (t) => re.test(t);
}

function escapeRe(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cross-component publish/subscribe + request/response bus.
 *
 * Federated components, host shells and remotes all inject a single shared
 * instance (providedIn: 'root') and communicate without direct imports.
 *
 * @example
 *   // Subscribe (in any component)
 *   inject(NexusBus).on<CartAdded>('cart:item-added')
 *     .subscribe((e) => console.log(e.payload.sku));
 *
 *   // Publish (fire-and-forget)
 *   bus.publish<CartAdded>('cart:item-added', { sku: 'A1', qty: 2 });
 *
 *   // Glob subscribe — receive any cart event
 *   bus.on('cart:*').subscribe((e) => console.log(e.topic, e.payload));
 *
 *   // Request/response
 *   const total = await bus.request<void, number>('cart:get-total');
 *
 *   // Handle requests
 *   bus.respond<void, number>('cart:get-total', () => 99.95);
 */
@Injectable({ providedIn: 'root' })
export class NexusBus {
  private readonly stream$ = new Subject<NexusEvent<unknown>>();
  private readonly responders = new Map<string, RequestHandler<unknown, unknown>>();

  constructor() {
    // Internal: when a request envelope flows past, look up a registered
    // responder and emit the response back through the same bus.
    this.stream$
      .pipe(filter((e): e is NexusRequest<unknown> => (e as NexusRequest).__kind === 'request'))
      .subscribe((req) => {
        const handler = this.responders.get(req.topic);
        if (!handler) return;
        Promise.resolve()
          .then(() => handler(req.payload, req))
          .then((res) => this.emitResponse(req.id, res))
          .catch((err: unknown) => this.emitResponse(req.id, undefined, err));
      });
  }

  /**
   * Listen for events matching the topic (exact or glob: `cart:*` / `cart:**`).
   * Returns Observable of full NexusEvent envelopes.
   */
  on<T = unknown>(topic: string): Observable<NexusEvent<T>> {
    const match = topicMatcher(topic);
    return this.stream$.pipe(
      filter((e): e is NexusEvent<T> => match(e.topic) && (e as NexusRequest).__kind !== 'request'),
    );
  }

  /**
   * Listen and project payloads only (drops the envelope wrapper).
   * Useful when you don't care about timestamps/source.
   */
  onPayload<T = unknown>(topic: string): Observable<T> {
    return this.on<T>(topic).pipe(map((e) => e.payload));
  }

  /**
   * Publish a fire-and-forget event. Returns the envelope id (useful for
   * correlating in logs).
   */
  publish<T = unknown>(topic: string, payload: T, opts: PublishOptions = {}): string {
    const id = makeId();
    this.stream$.next({
      topic,
      payload,
      timestamp: new Date().toISOString(),
      id,
      source: opts.source,
    });
    return id;
  }

  /**
   * Issue an RPC-style request. Resolves with the responder's value or
   * rejects on timeout / handler error.
   */
  request<TReq = unknown, TRes = unknown>(
    topic: string,
    payload: TReq = undefined as TReq,
    opts: RequestOptions = {},
  ): Promise<TRes> {
    const id = makeId();
    const timeoutMs = opts.timeoutMs ?? 5000;
    const responseTopic = `${RESPONSE_TOPIC_PREFIX}${id}`;

    return new Promise<TRes>((resolve, reject) => {
      const timer = setTimeout(() => {
        sub.unsubscribe();
        reject(new Error(`[nexus-bus] request "${topic}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const sub = this.stream$
        .pipe(filter((e) => e.topic === responseTopic))
        .subscribe((e) => {
          clearTimeout(timer);
          sub.unsubscribe();
          const res = e.payload as NexusResponse<TRes>;
          if (res.error) reject(new Error(res.error));
          else resolve(res.payload);
        });

      const req: NexusRequest<TReq> = {
        topic,
        payload,
        timestamp: new Date().toISOString(),
        id,
        source: opts.source,
        __kind: 'request',
      };
      this.stream$.next(req as NexusEvent<unknown>);
    });
  }

  /**
   * Register a handler that responds to requests on `topic`. Only one handler
   * per topic — last-registered wins. Returns an unsubscribe function.
   */
  respond<TReq = unknown, TRes = unknown>(
    topic: string,
    handler: RequestHandler<TReq, TRes>,
  ): () => void {
    this.responders.set(topic, handler as RequestHandler<unknown, unknown>);
    return () => {
      if (this.responders.get(topic) === (handler as RequestHandler<unknown, unknown>)) {
        this.responders.delete(topic);
      }
    };
  }

  private emitResponse(requestId: string, payload: unknown, error?: unknown): void {
    const res: NexusResponse = {
      requestId,
      payload,
      error: error instanceof Error ? error.message : error ? String(error) : undefined,
      __kind: 'response',
    };
    this.stream$.next({
      topic: `${RESPONSE_TOPIC_PREFIX}${requestId}`,
      payload: res,
      timestamp: new Date().toISOString(),
      id: makeId(),
    });
  }
}
