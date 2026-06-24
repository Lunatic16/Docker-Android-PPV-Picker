// ─────────────────────────────────────────────────────────────────────────────
// src/api/ppvClient.ts
// Ports PPVClient (httpx-based) → native fetch with identical request headers.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AppEvent,
  EventDetailResponse,
  IndexResponse,
  RawEventDetail,
  RawIndexStream,
} from '../types';
import { DEFAULT_API_BASE, mergeEventWithDetail } from '../utils/embedUtils';

// ─────────────────────────────────────────────────────────────────────────────
// §1  Wire-level constants
//
// Mirrors the Python-level network config at the top of ppv_picker.py.
// The User-Agent, Origin, and Referer headers are required by the ppv.to API.
// ─────────────────────────────────────────────────────────────────────────────

const USER_AGENT = 'ppv_picker/1.0 (+https://ppv.to) curl/8';
const TIMEOUT_MS = 15_000;

/**
 * Base request headers that must be sent on every API call.
 * Mirrors the `httpx.Client(headers={...})` constructor in PPVClient.__init__.
 */
const BASE_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Origin':     'https://ppv.to',
  'Referer':    'https://ppv.to/',
  'Accept':     'application/json',
};

// ─────────────────────────────────────────────────────────────────────────────
// §2  Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a native fetch call with a hard timeout using AbortController,
 * matching the `timeout=15.0` argument passed to httpx.Client.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...BASE_HEADERS,
        ...(options.headers as Record<string, string> | undefined),
      },
    });
    return res;
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Normalises a raw index stream object into an AppEvent.
 * Mirrors Event.from_index() in the Python script.
 */
function eventFromIndex(
  categoryName: string,
  raw: RawIndexStream,
): AppEvent {
  return {
    id:           Number(raw.id ?? 0),
    name:         String(raw.name ?? '?'),
    tag:          raw.tag ?? null,
    sourceTag:    raw.source_tag ?? null,
    locale:       raw.locale ?? null,
    categoryName,
    uri:          String(raw.uri_name ?? ''),
    poster:       raw.poster ?? null,
    startsAt:     Number(raw.starts_at ?? 0),
    endsAt:       Number(raw.ends_at ?? 0),
    viewers:      Number(raw.viewers ?? 0),
    alwaysLive:   Boolean(raw.always_live),
    iframe:       raw.iframe ?? null,
    substreams:   Array.isArray(raw.substreams) ? raw.substreams : [],
  };
}

/**
 * Normalises the per-event detail payload into a partial AppEvent.
 * Mirrors Event.from_event() in the Python script.
 *
 * Note: the detail endpoint uses start_timestamp / end_timestamp (not
 * starts_at / ends_at) and always_live_feed as an alias for always_live.
 */
function eventFromDetail(raw: RawEventDetail): Partial<AppEvent> {
  return {
    id:           Number(raw.id ?? 0),
    name:         String(raw.name ?? '?'),
    tag:          raw.tag ?? null,
    sourceTag:    raw.source_tag ?? null,
    locale:       raw.locale ?? null,
    categoryName: raw.category_name ?? '(?)',
    uri:          String(raw.uri ?? ''),
    poster:       raw.poster ?? null,
    startsAt:     Number(raw.start_timestamp ?? 0),
    endsAt:       Number(raw.end_timestamp ?? 0),
    viewers:      Number(raw.viewers ?? 0),
    alwaysLive:   Boolean(raw.always_live ?? raw.always_live_feed),
    iframe:       null,    // detail endpoint does not carry iframe
    substreams:   [],      // detail endpoint does not carry substreams
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// §3  PPVClient class
// ─────────────────────────────────────────────────────────────────────────────

export class PPVClient {
  private readonly apiBase: string;

  constructor(apiBase: string = DEFAULT_API_BASE) {
    this.apiBase = apiBase.replace(/\/$/, '');
  }

  // ── GET /api/streams ───────────────────────────────────────────────────────
  /**
   * Fetches the full event index grouped by category.
   * Returns a flat list of normalised AppEvent objects.
   *
   * Mirrors PPVClient.index() in the Python script.
   */
  async fetchIndex(): Promise<AppEvent[]> {
    const url = `${this.apiBase}/streams`;
    let res: Response;

    try {
      res = await fetchWithTimeout(url);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s (${url})`);
      }
      throw new Error(`Network error fetching index: ${String(err)}`);
    }

    if (!res.ok) {
      throw new Error(
        `Index request failed: HTTP ${res.status} ${res.statusText}`,
      );
    }

    let json: IndexResponse;
    try {
      json = (await res.json()) as IndexResponse;
    } catch {
      throw new Error('Index response was not valid JSON');
    }

    if (!json.success) {
      throw new Error(`API returned success=false on /streams`);
    }

    const events: AppEvent[] = [];
    for (const cat of json.streams ?? []) {
      const catName =
        cat.category ?? cat.category_name ?? '(?)';
      for (const raw of cat.streams ?? []) {
        events.push(eventFromIndex(catName, raw));
      }
    }

    return events;
  }

  // ── GET /api/streams/<uri> ─────────────────────────────────────────────────
  /**
   * Fetches per-event detail and merges it with the caller-supplied index
   * event (the same merge logic as the Python `run()` function).
   *
   * Throws a LookupError-equivalent (message starting "NOT_FOUND:") on 404.
   * Throws a generic Error on other failures.
   *
   * Mirrors PPVClient.event() + the merge block in run() in the Python script.
   */
  async fetchEventDetail(indexEvent: AppEvent): Promise<AppEvent> {
    const url = `${this.apiBase}/streams/${indexEvent.uri}`;
    let res: Response;

    try {
      res = await fetchWithTimeout(url);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(
          `Request timed out after ${TIMEOUT_MS / 1000}s (${url})`,
        );
      }
      throw new Error(`Network error fetching event detail: ${String(err)}`);
    }

    if (!res.ok) {
      throw new Error(
        `Event detail request failed: HTTP ${res.status} ${res.statusText}`,
      );
    }

    let json: EventDetailResponse;
    try {
      json = (await res.json()) as EventDetailResponse;
    } catch {
      throw new Error('Event detail response was not valid JSON');
    }

    if (!json.success) {
      const statusCode = json.statusCode ?? json.status_code;
      if (statusCode === 404) {
        throw new Error(`NOT_FOUND: ${indexEvent.uri}`);
      }
      throw new Error(
        `API returned success=false on /streams/${indexEvent.uri}`,
      );
    }

    if (!json.data) {
      // Graceful degradation: return the index event unchanged.
      return indexEvent;
    }

    const detailPartial = eventFromDetail(json.data);
    return mergeEventWithDetail(indexEvent, detailPartial);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §4  Singleton factory (shared across the app)
// ─────────────────────────────────────────────────────────────────────────────

let _clientInstance: PPVClient | null = null;

export function getPPVClient(apiBase?: string): PPVClient {
  if (!_clientInstance || apiBase) {
    _clientInstance = new PPVClient(apiBase ?? DEFAULT_API_BASE);
  }
  return _clientInstance;
}

export function resetPPVClient(apiBase: string): void {
  _clientInstance = new PPVClient(apiBase);
}
