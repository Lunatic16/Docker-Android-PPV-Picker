// ─────────────────────────────────────────────────────────────────────────────
// src/components/EventCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
//
// Android TV focus approach:
//   Pressable's style callback ({ focused }) is NOT reliable for D-pad focus
//   on Android TV — it was designed for touch/hover, not spatial navigation.
//
//   The correct pattern is:
//     • onFocus  → setState(true)
//     • onBlur   → setState(false)
//   Then drive all conditional rendering from that boolean.
//
//   Visual strategy for TV displays (viewed from 2–3m away):
//     • Background shifts to a clearly lighter value (#1e3a4f vs #161b22)
//     • A 4px solid sky-blue border replaces the 1px dim border
//     • A 4px solid left accent bar is rendered as an absolutely-positioned
//       child — this is the most TV-legible focus indicator pattern because
//       it creates a strong vertical stripe that reads at distance regardless
//       of content
//     • Text color on the event name brightens to pure white
//   None of this relies on shadowColor (iOS-only) or elevation colour (Android
//   elevation only produces a grey drop-shadow, not a coloured glow).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AppEvent, EventState } from '../types';
import { Colors, FontSize, Radius, Spacing } from './theme';
import { deriveEventState, formatStartTime } from '../utils/embedUtils';

// ─────────────────────────────────────────────────────────────────────────────
// StateBadge
// ─────────────────────────────────────────────────────────────────────────────

interface BadgeProps {
  state: EventState;
  alwaysLive: boolean;
}

function StateBadge({ state, alwaysLive }: BadgeProps) {
  if (alwaysLive) {
    return (
      <View style={[styles.badge, { backgroundColor: Colors.sage + '33' }]}>
        <Text style={[styles.badgeText, { color: Colors.sage }]}>24/7</Text>
      </View>
    );
  }
  switch (state) {
    case 'live':
      return (
        <View style={[styles.badge, { backgroundColor: Colors.live + '33' }]}>
          <Text style={[styles.badgeText, { color: Colors.live }]}>● LIVE</Text>
        </View>
      );
    case 'soon':
      return (
        <View style={[styles.badge, { backgroundColor: Colors.amber + '22' }]}>
          <Text style={[styles.badgeText, { color: Colors.amber }]}>SOON</Text>
        </View>
      );
    case 'ended':
      return (
        <View style={[styles.badge, { backgroundColor: Colors.bgCard }]}>
          <Text style={[styles.badgeText, { color: Colors.textMuted }]}>DONE</Text>
        </View>
      );
    default:
      return <View style={[styles.badge, { backgroundColor: 'transparent' }]} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EventCard
// ─────────────────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: AppEvent;
  onPress: (event: AppEvent) => void;
  hasTVPreferredFocus?: boolean;
}

export const EventCard = React.memo(function EventCard({
  event,
  onPress,
  hasTVPreferredFocus = false,
}: EventCardProps) {
  const state     = deriveEventState(event);
  const startTime = formatStartTime(event.startsAt);

  // ── Focus state — driven by onFocus/onBlur, not the style callback ─────────
  // This is the reliable path for Android TV D-pad focus tracking.
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => setIsFocused(true),  []);
  const handleBlur  = useCallback(() => setIsFocused(false), []);
  const handlePress = useCallback(() => onPress(event),       [event, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      focusable={true}
      // @ts-ignore — hasTVPreferredFocus is a valid RN TV prop
      hasTVPreferredFocus={hasTVPreferredFocus}
      // Style callback is kept for pressed (touch) feedback, but focus
      // styling is handled via isFocused state below — NOT from `focused`.
      style={({ pressed }) => [
        styles.card,
        isFocused && styles.cardFocused,
        pressed   && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${event.name}, ${state}, ${startTime}`}
    >
      {/* ── Left accent bar — only rendered when focused ─────────────────── */}
      {/* Absolutely positioned so it sits flush against the card's left      */}
      {/* edge without affecting the inner layout. This is the most visible   */}
      {/* TV focus indicator: a strong coloured stripe readable from 3m away. */}
      {isFocused && <View style={styles.focusAccentBar} />}

      {/* ── Top row: badge + event name ──────────────────────────────────── */}
      <View style={styles.topRow}>
        <StateBadge state={state} alwaysLive={event.alwaysLive} />
        <Text
          style={[styles.name, isFocused && styles.nameFocused]}
          numberOfLines={1}
        >
          {event.name}
        </Text>
      </View>

      {/* ── Bottom row: category + time ───────────────────────────────────── */}
      <View style={styles.bottomRow}>
        {event.sourceTag ? (
          <Text style={styles.sourceTag} numberOfLines={1}>
            {event.sourceTag}
          </Text>
        ) : null}

        {event.categoryName ? (
          <Text style={styles.category} numberOfLines={1}>
            {event.categoryName}
          </Text>
        ) : null}

        <Text
          style={[
            styles.time,
            state === 'live'  && { color: Colors.live  },
            state === 'soon'  && { color: Colors.amber },
            state === 'ended' && { color: Colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {startTime}
        </Text>
      </View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor:  Colors.bgCard,
    marginHorizontal: Spacing.md,
    marginVertical:   Spacing.xs,
    borderRadius:     Radius.md,
    paddingVertical:  Spacing.md,
    paddingLeft:      Spacing.lg + 4, // leave room for the accent bar
    paddingRight:     Spacing.md,
    borderWidth:      1,
    borderColor:      Colors.border,
    // Position context for the absolutely-placed accent bar
    overflow:         'hidden',
  },

  // Applied when isFocused === true
  cardFocused: {
    backgroundColor: '#1e3a4f',   // clearly lighter than bgCard (#161b22)
    borderWidth:     4,
    borderColor:     Colors.sky,  // bright cornflower blue
  },

  // Applied when physically pressed (touch screens)
  cardPressed: {
    backgroundColor: Colors.bgSelected,
    borderColor:     Colors.sky,
  },

  // ── Left accent bar ───────────────────────────────────────────────────────
  // Rendered as an absolutely-positioned child only when focused.
  // 4px wide, full card height, sky blue — the strongest possible TV cue.
  focusAccentBar: {
    position:        'absolute',
    left:            0,
    top:             0,
    bottom:          0,
    width:           6,
    backgroundColor: Colors.sky,
    borderTopLeftRadius:    Radius.md,
    borderBottomLeftRadius: Radius.md,
  },

  // ── Content rows ──────────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  Spacing.xs,
  },

  badge: {
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    marginRight:       Spacing.sm,
    minWidth:          44,
    alignItems:        'center',
  },
  badgeText: {
    fontSize:      FontSize.xs,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },

  name: {
    flex:       1,
    fontSize:   FontSize.base,
    fontWeight: '600',
    color:      Colors.textPrimary,
  },
  // Brighten name text when focused so it pops on the darker TV background
  nameFocused: {
    color:      Colors.white,
    fontWeight: '700',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },
  sourceTag: {
    fontSize:    FontSize.sm,
    color:       Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  category: {
    fontSize:    FontSize.xs,
    color:       Colors.textMuted,
    marginRight: Spacing.sm,
    flexShrink:  1,
  },
  time: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    marginLeft: 'auto',
  },
});
