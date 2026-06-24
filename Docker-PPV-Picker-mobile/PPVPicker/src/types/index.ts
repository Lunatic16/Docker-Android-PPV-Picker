// ─────────────────────────────────────────────────────────────────────────────
// src/types/index.ts
// Strict TypeScript interfaces mirroring the ppv.to Nuxt SPA JSON payloads
// and the Python dataclass models (Event, Embed, index category groupings).
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// §1  Raw API wire shapes  (what the server actually sends)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single substream entry as it arrives inside an index stream object or an
 * event-detail response.  All fields are potentially absent / null.
 */
export interface RawSubstream {
  uri?: string | null;
  source_tag?: string | null;
  locale?: string | null;
  iframe?: string | null;
}

/**
 * A single stream object inside a category bucket on GET /api/streams.
 */
export interface RawIndexStream {
  id?: number | string | null;
  name?: string | null;
  tag?: string | null;
  source_tag?: string | null;
  locale?: string | null;
  uri_name?: string | null;
  poster?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
  viewers?: number | null;
  always_live?: boolean | null;
  iframe?: string | null;
  substreams?: RawSubstream[] | null;
}

/**
 * A category bucket from GET /api/streams.
 * The "category" field name differs between index revisions; both are checked.
 */
export interface RawIndexCategory {
  category?: string | null;
  category_name?: string | null;
  streams?: RawIndexStream[] | null;
}

/**
 * Top-level GET /api/streams response envelope.
 */
export interface IndexResponse {
  success: boolean;
  streams?: RawIndexCategory[] | null;
}

/**
 * The `data` object returned inside GET /api/streams/<uri> when success=true.
 * Field names differ slightly from the index representation.
 */
export interface RawEventDetail {
  id?: number | string | null;
  name?: string | null;
  tag?: string | null;
  source_tag?: string | null;
  locale?: string | null;
  category_name?: string | null;
  uri?: string | null;
  poster?: string | null;
  start_timestamp?: number | null;   // note: different key from starts_at
  end_timestamp?: number | null;     // note: different key from ends_at
  viewers?: number | null;
  always_live?: boolean | null;
  always_live_feed?: boolean | null; // legacy alias used in from_event()
  // No iframe / substreams at this endpoint level
}

/**
 * Top-level GET /api/streams/<uri> response envelope.
 */
export interface EventDetailResponse {
  success: boolean;
  statusCode?: number | null;
  status_code?: number | null;
  data?: RawEventDetail | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// §2  Application-level domain models
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discriminated union for the state of an event relative to the current time.
 */
export type EventState = "live" | "soon" | "ended" | "info";

/**
 * Normalised, app-internal event model.  Mirrors the Python `Event` dataclass.
 */
export interface AppEvent {
  id: number;
  name: string;
  tag: string | null;
  sourceTag: string | null;        // camelCased from source_tag
  locale: string | null;
  categoryName: string | null;
  uri: string;                     // uri_name from index, uri from detail
  poster: string | null;
  startsAt: number;                // unix timestamp
  endsAt: number;                  // unix timestamp
  viewers: number;
  alwaysLive: boolean;
  iframe: string | null;
  substreams: RawSubstream[];
}

/**
 * A single playable embed source — default feed or a named substream.
 * Mirrors the Python `Embed` dataclass.
 */
export interface AppEmbed {
  /** Display label shown in the stream-selection list. */
  label: string;
  /** URI tail used for building share URLs; may be null when recovered. */
  uri: string | null;
  /** BCP-47 locale tag, e.g. "en", "es", "pt-BR". */
  locale: string | null;
  /** Direct embed iframe src URL — passed straight to the WebView. */
  iframeUrl: string;
  /** True only for the event's primary / default stream. */
  isDefault: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3  Navigation param-list
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Typed route params consumed by React Navigation's Native Stack.
 * Import this in each screen to get type-safe `route.params`.
 */
export type RootStackParamList = {
  EventList: undefined;
  StreamSelection: {
    event: AppEvent;
  };
  VideoPlayer: {
    embed: AppEmbed;
    eventUri: string;
    ppvHost: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// §4  API configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiConfig {
  /** Full base URL, e.g. "https://api.ppv.to/api" */
  apiBase: string;
  /** Derived frontend host for share URL generation, e.g. "ppv.to" */
  ppvHost: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// §5  Store shape (consumed by useAppStore)
// ─────────────────────────────────────────────────────────────────────────────

export interface AppStoreState {
  // configuration
  config: ApiConfig;

  // event list
  events: AppEvent[];
  eventsLoading: boolean;
  eventsError: string | null;

  // event detail (embeds)
  embeds: AppEmbed[];
  embedsLoading: boolean;
  embedsError: string | null;

  // currently viewed event (set when navigating to StreamSelection)
  selectedEvent: AppEvent | null;

  // currently viewed embed (set when navigating to VideoPlayer)
  selectedEmbed: AppEmbed | null;
}

export interface AppStoreActions {
  setConfig: (config: Partial<ApiConfig>) => void;
  fetchEvents: () => Promise<void>;
  fetchEmbeds: (event: AppEvent) => Promise<void>;
  setSelectedEvent: (event: AppEvent | null) => void;
  setSelectedEmbed: (embed: AppEmbed | null) => void;
  clearEmbeds: () => void;
}

export type AppStore = AppStoreState & AppStoreActions;
