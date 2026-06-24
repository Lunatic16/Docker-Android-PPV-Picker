// ─────────────────────────────────────────────────────────────────────────────
// src/utils/embedUtils.ts
// Utility functions ported 1-to-1 from the Python script.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppEmbed, AppEvent, EventState, RawSubstream } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// §1  Constants (mirrors Python-level CONFIG at the top of ppv_picker.py)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_API_BASE = 'https://api.ppv.to/api';
export const ALT_API_BASES    = ['https://api.ppv.st/api'] as const;

export const API_DOMAINS = [
  'ppv.to',
  'ppv.st',
  'ppv.cx',
  'ppv.is',
  'ppv.lc',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// §2  _recover_uri_from_iframe
//
// Python original:
//   def _recover_uri_from_iframe(iframe_url: str) -> str:
//       if not iframe_url:
//           return ""
//       return re.sub(r"^https?://[^/]+/embed/", "", iframe_url)
//
// Strips the origin + /embed/ prefix from an iframe src to obtain the stream
// URI tail, e.g.:
//   "https://embedindia.st/embed/argentina-vs-austria-1" → "argentina-vs-austria-1"
// ─────────────────────────────────────────────────────────────────────────────

const EMBED_PREFIX_RE = /^https?:\/\/[^/]+\/embed\//;

export function recoverUriFromIframe(iframeUrl: string): string {
  if (!iframeUrl) return '';
  return iframeUrl.replace(EMBED_PREFIX_RE, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// §3  buildPpvUrl
//
// Python original (Embed.ppv_url):
//   tail = self.uri or re.sub(r"^https?://[^/]+/embed/", "", self.iframe_url)
//   if event_uri and not tail.startswith(event_uri):
//       tail = f"{event_uri.rstrip('/')}/{tail.lstrip('/')}"
//   return f"https://{host}/live/{tail}" if tail else f"https://{host}/"
// ─────────────────────────────────────────────────────────────────────────────

export function buildPpvUrl(
  embed: AppEmbed,
  ppvHost: string = 'ppv.to',
  eventUri?: string | null,
): string {
  let tail = '';

  if (embed.uri) {
    tail = embed.uri;
    if (eventUri && !tail.startsWith(eventUri)) {
      tail = `${eventUri.replace(/\/$/, '')}/${tail.replace(/^\//, '')}`;
    }
  } else if (embed.iframeUrl) {
    tail = recoverUriFromIframe(embed.iframeUrl);
  }

  return tail ? `https://${ppvHost}/live/${tail}` : `https://${ppvHost}/`;
}

// ─────────────────────────────────────────────────────────────────────────────
// §4  deriveEmbeds
//
// Python original (Event.embeds()):
//   out = []
//   if default_iframe:
//       out.append(Embed(label="<source_tag> (default)", ..., is_default=True))
//   for sub in self.substreams:
//       uri = sub.get("uri") or _recover_uri_from_iframe(sub.get("iframe") or "")
//       out.append(Embed(label=sub.get("source_tag") or uri or "Stream", ...))
//   return out
// ─────────────────────────────────────────────────────────────────────────────

export function deriveEmbeds(event: AppEvent): AppEmbed[] {
  const out: AppEmbed[] = [];

  if (event.iframe) {
    out.push({
      label: `${event.sourceTag ?? 'Default'} (default)`,
      uri: null,
      locale: event.locale,
      iframeUrl: event.iframe,
      isDefault: true,
    });
  }

  for (const sub of event.substreams) {
    const uri =
      sub.uri || recoverUriFromIframe(sub.iframe ?? '');

    out.push({
      label: sub.source_tag ?? uri ?? 'Stream',
      uri: uri || null,
      locale: sub.locale ?? null,
      iframeUrl: sub.iframe ?? '',
      isDefault: false,
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// §5  deriveEventState
//
// Python original (format_start):
//   if ends_at and ends_at < now:   state = "ended"
//   elif starts_at <= now:          state = "live"
//   elif starts_at - now < 86400:   state = "soon"
//   else:                           state = "info"
// ─────────────────────────────────────────────────────────────────────────────

export function deriveEventState(event: AppEvent): EventState {
  if (!event.startsAt) return 'info';
  const now = Math.floor(Date.now() / 1000);
  if (event.endsAt && event.endsAt < now) return 'ended';
  if (event.startsAt <= now) return 'live';
  if (event.startsAt - now < 86_400) return 'soon';
  return 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// §6  formatStartTime
//
// Python original (format_start time.strftime):
//   txt = time.strftime("%b %d %I:%M %p %Z", time.localtime(unix_ts)).strip()
//
// Produces e.g. "Jun 15 08:00 PM EDT" in the device's local timezone.
// ─────────────────────────────────────────────────────────────────────────────

export function formatStartTime(unixTs: number): string {
  if (!unixTs) return '—';
  const d = new Date(unixTs * 1000);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §7  derivePpvHost
//
// Python original:
//   def derive_ppv_host(api_base: str) -> str:
//       for d in API_DOMAINS:
//           if d in api_base:
//               return d
//       return "ppv.to"
// ─────────────────────────────────────────────────────────────────────────────

export function derivePpvHost(apiBase: string): string {
  for (const domain of API_DOMAINS) {
    if (apiBase.includes(domain)) return domain;
  }
  return 'ppv.to';
}

// ─────────────────────────────────────────────────────────────────────────────
// §8  sortEvents
//
// Python original:
//   events.sort(key=lambda e: (e.always_live, e.starts_at, e.category_name or ""))
//
// always_live events float to the bottom so live upcoming events appear first.
// ─────────────────────────────────────────────────────────────────────────────

export function sortEvents(events: AppEvent[]): AppEvent[] {
  return [...events].sort((a, b) => {
    // always_live → sort last (treat true as 1, false as 0)
    const aliveA = a.alwaysLive ? 1 : 0;
    const aliveB = b.alwaysLive ? 1 : 0;
    if (aliveA !== aliveB) return aliveA - aliveB;

    // earlier starts first
    if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt;

    // stable: alpha by category
    return (a.categoryName ?? '').localeCompare(b.categoryName ?? '');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §9  mergeEventWithDetail
//
// Python original (run() merge block):
//   fresh = Event.from_event(detail)
//   fresh.substreams = chosen.substreams or fresh.substreams
//   fresh.iframe     = chosen.iframe or fresh.iframe
//   chosen           = fresh
//
// Merges the per-event detail response into the index event, preferring
// substream / iframe data from the richer index entry when available.
// ─────────────────────────────────────────────────────────────────────────────

export function mergeEventWithDetail(
  indexEvent: AppEvent,
  detailPartial: Partial<AppEvent>,
): AppEvent {
  return {
    ...detailPartial,
    // always keep index-level id / name as ground truth when both present
    id: detailPartial.id ?? indexEvent.id,
    name: detailPartial.name ?? indexEvent.name,
    uri: detailPartial.uri || indexEvent.uri,
    categoryName: detailPartial.categoryName ?? indexEvent.categoryName,
    // index substreams and iframe take priority if non-empty
    substreams:
      indexEvent.substreams.length > 0
        ? indexEvent.substreams
        : (detailPartial.substreams ?? []),
    iframe: indexEvent.iframe || detailPartial.iframe || null,
    // keep remaining fields from the richer detail where available
    tag: detailPartial.tag ?? indexEvent.tag,
    sourceTag: detailPartial.sourceTag ?? indexEvent.sourceTag,
    locale: detailPartial.locale ?? indexEvent.locale,
    poster: detailPartial.poster ?? indexEvent.poster,
    startsAt: detailPartial.startsAt ?? indexEvent.startsAt,
    endsAt: detailPartial.endsAt ?? indexEvent.endsAt,
    viewers: detailPartial.viewers ?? indexEvent.viewers,
    alwaysLive: detailPartial.alwaysLive ?? indexEvent.alwaysLive,
  } as AppEvent;
}
