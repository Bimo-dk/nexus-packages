/** Envelope around every publish/request — internal shape on the wire. */
export interface NexusEvent<T = unknown> {
  /** Topic name. Convention: `domain:action` (e.g. `cart:item-added`). */
  topic: string;
  /** Caller-supplied payload (typed at the call site). */
  payload: T;
  /** ISO timestamp the event was emitted. */
  timestamp: string;
  /** Correlation id for tracing (auto-generated). */
  id: string;
  /** Source remote/component that published it (best-effort, free-form). */
  source?: string;
}

/** Request/response envelope — used by `request()` + `respond()`. */
export interface NexusRequest<T = unknown> extends NexusEvent<T> {
  /** Internal: marker that this is a request awaiting response. */
  __kind: 'request';
}

export interface NexusResponse<T = unknown> {
  /** id of the original request — responder echoes it back. */
  requestId: string;
  /** Response payload. */
  payload: T;
  /** If set, the request failed and `payload` may be undefined. */
  error?: string;
  __kind: 'response';
}

/** Handler signature passed to `respond()`. May return value, Promise, or Observable. */
export type RequestHandler<TReq = unknown, TRes = unknown> = (
  payload: TReq,
  event: NexusRequest<TReq>,
) => TRes | Promise<TRes>;

export interface PublishOptions {
  /** Free-form source identifier (which remote/component sent it). */
  source?: string;
}

export interface RequestOptions extends PublishOptions {
  /** Max wait time before request rejects with timeout. Default 5000ms. */
  timeoutMs?: number;
}
