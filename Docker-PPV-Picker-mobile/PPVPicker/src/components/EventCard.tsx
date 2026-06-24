// ─────────────────────────────────────────────────────────────────────────────
// src/components/EventCard.tsx
// Reusable list row for the EventList screen.
// Supports touch + D-pad/remote focus (focusable={true}).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback } from 'react';
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
// Badge sub-component
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
  /** When true the item will request TV focus on mount (first item). */
  hasTVPreferredFocus?: boolean;
}

export const EventCard = React.memo(function EventCard({
  event,
  onPress,
  hasTVPreferredFocus = false,
}: EventCardProps) {
  const state     = deriveEventState(event);
  const startTime = formatStartTime(event.startsAt);
  const handlePress = useCallback(() => onPress(event), [event, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      focusable={true}
      // @ts-ignore — RN TV prop
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={({ pressed, focused }) => [
        styles.card,
        focused && styles.cardFocused,  // <-- Force focused style separately
        pressed && styles.cardPressed,  // <-- Keep a separate optional touch style
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${event.name}, ${state}, ${startTime}`}
    >
      {/* Top row: badge + name */}
      <View style={styles.topRow}>
        <StateBadge state={state} alwaysLive={event.alwaysLive} />
        <Text style={styles.name} numberOfLines={1}>
          {event.name}
        </Text>
      </View>

      {/* Bottom row: source tag / category / time */}
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
    padding:          Spacing.md,
    borderWidth:      3,
    borderColor:      Colors.bgCard, // Blends perfectly when not focused
  },
    cardDefault: {
    borderWidth:      3,
    borderColor:      Colors.sage + '44',
  },
  cardFocused: {
    backgroundColor:  Colors.bgSelected,
    borderColor:      Colors.sky,      // Bright sky focus outline
    transform:        [{ scale: 1.15 }], // Pops outward slightly
    elevation:        8,
  },
  cardPressed: {
    backgroundColor:  Colors.bgSelected,
    opacity:          0.85,
  },
  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   Spacing.xs,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    marginRight:       Spacing.sm,
    minWidth:          44,
    alignItems:        'center',
  },
  badgeText: {
    fontSize:   FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  name: {
    flex:       1,
    fontSize:   FontSize.base,
    fontWeight: '600',
    color:      Colors.textPrimary,
  },
  bottomRow: {
    flexDirection:  'row',
    alignItems:     'center',
    flexWrap:       'wrap',
    gap:            Spacing.sm,
  },
  sourceTag: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  category: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    marginRight: Spacing.sm,
    flexShrink: 1,
  },
  time: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    marginLeft: 'auto',
  },
});
