// ─────────────────────────────────────────────────────────────────────────────
// src/components/EmbedCard.tsx
// Reusable list row for the StreamSelection screen.
// Uses onFocus/onBlur (not style-callback focused) for reliable Android TV
// D-pad focus tracking — same pattern as EventCard.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AppEmbed } from '../types';
import { Colors, FontSize, Radius, Spacing } from './theme';

interface EmbedCardProps {
  embed: AppEmbed;
  index: number;
  onPress: (embed: AppEmbed) => void;
  hasTVPreferredFocus?: boolean;
}

export const EmbedCard = React.memo(function EmbedCard({
  embed,
  index,
  onPress,
  hasTVPreferredFocus = false,
}: EmbedCardProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => setIsFocused(true),  []);
  const handleBlur  = useCallback(() => setIsFocused(false), []);
  const handlePress = useCallback(() => onPress(embed),       [embed, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      focusable={true}
      // @ts-ignore — RN TV prop
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={({ pressed }) => [
        styles.card,
        embed.isDefault && styles.cardDefault,
        isFocused && styles.cardFocused,
        pressed   && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        `Stream ${index + 1}: ${embed.label}` +
        (embed.locale ? `, ${embed.locale}` : '') +
        (embed.isDefault ? ', default' : '')
      }
    >
      {/* Left accent bar — only rendered when focused */}
      {isFocused && <View style={styles.focusAccentBar} />}

      <View style={styles.row}>
        {/* Star / bullet marker */}
        <Text style={[styles.marker, embed.isDefault && { color: Colors.sage }]}>
          {embed.isDefault ? '★' : '◦'}
        </Text>

        <View style={styles.labelBlock}>
          <Text
            style={[
              styles.label,
              embed.isDefault && styles.labelDefault,
              isFocused       && styles.labelFocused,
            ]}
            numberOfLines={1}
          >
            {embed.label}
          </Text>

          {embed.locale ? (
            <Text style={styles.locale}>[{embed.locale}]</Text>
          ) : null}
        </View>

        {embed.isDefault ? (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
          </View>
        ) : (
          <Text style={styles.indexNum}>#{index + 1}</Text>
        )}
      </View>

      {embed.iframeUrl ? (
        <Text style={styles.iframeUrl} numberOfLines={1} ellipsizeMode="middle">
          {embed.iframeUrl}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor:  Colors.bgCard,
    marginHorizontal: Spacing.md,
    marginVertical:   Spacing.xs,
    borderRadius:     Radius.md,
    paddingVertical:  Spacing.md,
    paddingLeft:      Spacing.lg + 4,
    paddingRight:     Spacing.md,
    borderWidth:      1,
    borderColor:      Colors.border,
    overflow:         'hidden',
  },
  cardDefault: {
    borderColor: Colors.sage + '66',
  },
  cardFocused: {
    backgroundColor: '#1e3a4f',
    borderWidth:     4,
    borderColor:     Colors.sky,
  },
  cardPressed: {
    backgroundColor: Colors.bgSelected,
    borderColor:     Colors.sky,
  },

  focusAccentBar: {
    position:               'absolute',
    left:                   0,
    top:                    0,
    bottom:                 0,
    width:                  6,
    backgroundColor:        Colors.sky,
    borderTopLeftRadius:    Radius.md,
    borderBottomLeftRadius: Radius.md,
  },

  row: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  marker: {
    fontSize:    FontSize.lg,
    color:       Colors.textMuted,
    marginRight: Spacing.sm,
    width:       20,
    textAlign:   'center',
  },
  labelBlock: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    flexWrap:       'wrap',
    gap:            Spacing.xs,
  },
  label: {
    fontSize:   FontSize.base,
    fontWeight: '600',
    color:      Colors.textPrimary,
    flexShrink: 1,
  },
  labelDefault: {
    color: Colors.sage,
  },
  labelFocused: {
    color:      Colors.white,
    fontWeight: '700',
  },
  locale: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },

  defaultBadge: {
    backgroundColor:   Colors.sage + '22',
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    marginLeft:        Spacing.sm,
  },
  defaultBadgeText: {
    fontSize:      FontSize.xs,
    fontWeight:    '700',
    color:         Colors.sage,
    letterSpacing: 0.5,
  },
  indexNum: {
    fontSize:   FontSize.sm,
    color:      Colors.textMuted,
    marginLeft: Spacing.sm,
    minWidth:   24,
    textAlign:  'right',
  },

  iframeUrl: {
    marginTop:   Spacing.xs,
    fontSize:    FontSize.xs,
    color:       Colors.textMuted,
    paddingLeft: 28,
  },
});
