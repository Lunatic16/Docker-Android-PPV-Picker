// ─────────────────────────────────────────────────────────────────────────────
// src/store/useAppStore.ts
// Global Zustand store — single source of truth for events, embeds, and config.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { getPPVClient, resetPPVClient } from '../api/ppvClient';
import type { AppEmbed, AppEvent, AppStore, ApiConfig } from '../types';
import {
  DEFAULT_API_BASE,
  deriveEmbeds,
  derivePpvHost,
  sortEvents,
} from '../utils/embedUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const initialConfig: ApiConfig = {
  apiBase: DEFAULT_API_BASE,
  ppvHost: derivePpvHost(DEFAULT_API_BASE),
};

// ─────────────────────────────────────────────────────────────────────────────
// Store definition
// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  // ── state ──────────────────────────────────────────────────────────────────

  config: initialConfig,

  events: [],
  eventsLoading: false,
  eventsError: null,

  embeds: [],
  embedsLoading: false,
  embedsError: null,

  selectedEvent: null,
  selectedEmbed: null,

  // ── actions ────────────────────────────────────────────────────────────────

  /**
   * Update the API base URL and derive the matching ppv frontend host.
   * Recreates the PPVClient singleton so the new base takes effect immediately.
   */
  setConfig: (partial: Partial<ApiConfig>) => {
    const next: ApiConfig = { ...get().config, ...partial };
    if (partial.apiBase) {
      next.ppvHost = derivePpvHost(partial.apiBase);
      resetPPVClient(partial.apiBase);
    }
    set({ config: next });
  },

  /**
   * Fetches the full event index from GET /api/streams and stores a sorted,
   * normalised list in state.
   *
   * Mirrors the "fetch event index" block in the Python run() function.
   */
  fetchEvents: async () => {
    set({ eventsLoading: true, eventsError: null });
    try {
      const client = getPPVClient(get().config.apiBase);
      const raw    = await client.fetchIndex();
      set({
        events:        sortEvents(raw),
        eventsLoading: false,
        eventsError:   null,
      });
    } catch (err: unknown) {
      set({
        eventsLoading: false,
        eventsError:   err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * Fetches per-event detail and derives the list of playable embeds.
   *
   * Mirrors the "fetch per-event detail" + Event.embeds() block in run().
   * On 404 / network failure the index event's embeds are still shown, so the
   * user always has at least the default iframe to fall back on.
   */
  fetchEmbeds: async (event: AppEvent) => {
    set({
      selectedEvent: event,
      embeds:        [],
      embedsLoading: true,
      embedsError:   null,
    });

    let mergedEvent = event;
    try {
      const client  = getPPVClient(get().config.apiBase);
      mergedEvent   = await client.fetchEventDetail(event);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Non-fatal: we'll still build embeds from the index event below.
      // Only surface the error if we end up with no embeds at all.
      console.warn('[PPVPicker] fetchEventDetail:', msg);
    }

    // Update selectedEvent to the merged/detail version (or fallback original)
    set({ selectedEvent: mergedEvent });

    const embeds: AppEmbed[] = deriveEmbeds(mergedEvent);

    if (embeds.length === 0) {
      set({
        embedsLoading: false,
        embedsError:   'No playable sources found for this event.',
      });
    } else {
      set({
        embeds:        embeds,
        embedsLoading: false,
        embedsError:   null,
      });
    }
  },

  setSelectedEvent: (event: AppEvent | null) => {
    set({ selectedEvent: event });
  },

  setSelectedEmbed: (embed: AppEmbed | null) => {
    set({ selectedEmbed: embed });
  },

  clearEmbeds: () => {
    set({
      embeds:        [],
      embedsError:   null,
      selectedEmbed: null,
    });
  },
}));
