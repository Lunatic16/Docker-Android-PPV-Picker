// ─────────────────────────────────────────────────────────────────────────────
// src/components/EmbedCard.tsx
// Reusable list row for the StreamSelection screen.
// Mirrors the embed_row() formatter from the Python script.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback } from 'react';
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
  const handlePress = useCallback(() => onPress(embed), [embed, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      focusable={true}
      // @ts-ignore — RN TV prop
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={({ pressed, focused }) => [
        styles.card,
        embed.isDefault && styles.cardDefault,
        (pressed || focused) && styles.cardFocused,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Stream source ${index + 1}: ${embed.label}`}
    >
      <View style={styles.row}>
        {/* Stream counter index */}
        <Text style={styles.marker}>{index + 1}</Text>

        <View style={styles.labelBlock}>
          <Text
            style={[styles.label, embed.isDefault && styles.labelDefault]}
            numberOfLines={1}
          >
            {embed.label}
          </Text>

          {embed.locale ? (
            <Text style={styles.locale}>({embed.locale})</Text>
          ) : null}

          {embed.isDefault ? (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    padding:          Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical:   Spacing.xs,
    backgroundColor:  Colors.bgCard,
    borderRadius:     Radius.md,
    borderWidth:      3,
    borderColor:      Colors.bgCard,
  },
  cardDefault: {
    borderWidth:      3,
    borderColor:      Colors.sage + '44',
  },
  cardFocused: {
    backgroundColor:  Colors.bgSelected,
    borderColor:      Colors.sky,
    transform:        [{ scale: 1.03 }],
    elevation:        8,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
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
  locale: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
  defaultBadge: {
    backgroundColor: Colors.sage + '22',
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    marginLeft:        Spacing.sm,
  },
  defaultBadgeText: {
    fontSize:   FontSize.xs,
    fontWeight: '700',
    color:      Colors.sage,
    letterSpacing: 0.5,
  },
});
