// ─────────────────────────────────────────────────────────────────────────────
// src/screens/StreamSelectionScreen.tsx
// Screen 2 of 3 — Source / substream picker for a chosen event.
//
// Mirrors the "source picker" block in the Python run() function:
//   rows2 = [embed_row(e, c) for e in embeds]
//   idx2  = pick_from_list("Select a source …", rows2, c=c)
//
// Performance notes (same ARMv7 constraints as EventListScreen):
//   • initialNumToRender = 6  (substream lists are rarely > 20 items)
//   • windowSize = 3          (tiny window — list is short)
//   • removeClippedSubviews   (drop off-screen native views on Android)
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmbedCard } from '../components/EmbedCard';
import { Colors, FontSize, Radius, Spacing } from '../components/theme';
import { useAppStore } from '../store/useAppStore';
import type { AppEmbed, RootStackParamList } from '../types';
import {
  buildPpvUrl,
  deriveEventState,
  formatStartTime,
} from '../utils/embedUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'StreamSelection'>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function StreamSelectionScreen({ navigation, route }: Props) {
  const { event: routeEvent } = route.params;

  const embeds        = useAppStore(s => s.embeds);
  const embedsLoading = useAppStore(s => s.embedsLoading);
  const embedsError   = useAppStore(s => s.embedsError);
  const selectedEvent = useAppStore(s => s.selectedEvent);
  const fetchEmbeds   = useAppStore(s => s.fetchEmbeds);
  const ppvHost       = useAppStore(s => s.config.ppvHost);

  // If we arrive here before the store action has been called (e.g. deep link)
  // trigger a fetch for the route's event.
  useEffect(() => {
    if (!embedsLoading && embeds.length === 0 && !embedsError) {
      fetchEmbeds(routeEvent);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use the merged/detailed event from store if available, else route param
  const event = selectedEvent ?? routeEvent;
  const state = deriveEventState(event);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleEmbedPress = useCallback(
    (embed: AppEmbed) => {
      navigation.navigate('VideoPlayer', {
        embed,
        eventUri: event.uri,
        ppvHost,
      });
    },
    [navigation, event.uri, ppvHost],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── List helpers ───────────────────────────────────────────────────────────
  const keyExtractor = useCallback(
    (item: AppEmbed, index: number) =>
      item.iframeUrl || item.uri || String(index),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AppEmbed; index: number }) => (
      <EmbedCard
        embed={item}
        index={index}
        onPress={handleEmbedPress}
        hasTVPreferredFocus={index === 0}
      />
    ),
    [handleEmbedPress],
  );

  // ── Event info header ──────────────────────────────────────────────────────
  const EventInfoBanner = useMemo(() => (
    <View style={styles.eventBanner}>
      {/* Back button — D-pad focusable */}
      <Pressable
        onPress={handleBack}
        focusable={true}
        style={({ pressed, focused }) => [
          styles.backBtn,
          (pressed || focused) && styles.backBtnFocused,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Back to event list"
      >
        <Text style={styles.backBtnText}>‹ Back</Text>
      </Pressable>

      <Text style={styles.eventName} numberOfLines={2}>
        {event.name}
      </Text>

      <View style={styles.eventMeta}>
        {/* State badge */}
        <View
          style={[
            styles.statePill,
            state === 'live'  && { backgroundColor: Colors.live  + '33' },
            state === 'soon'  && { backgroundColor: Colors.amber + '22' },
            state === 'ended' && { backgroundColor: Colors.bgCard },
            event.alwaysLive  && { backgroundColor: Colors.sage  + '33' },
          ]}
        >
          <Text
            style={[
              styles.statePillText,
              state === 'live'  && { color: Colors.live  },
              state === 'soon'  && { color: Colors.amber },
              state === 'ended' && { color: Colors.textMuted },
              event.alwaysLive  && { color: Colors.sage  },
            ]}
          >
            {event.alwaysLive
              ? '24/7'
              : state === 'live'
              ? '● LIVE'
              : state === 'soon'
              ? 'SOON'
              : state === 'ended'
              ? 'DONE'
              : ''}
          </Text>
        </View>

        {event.categoryName ? (
          <Text style={styles.metaChip}>{event.categoryName}</Text>
        ) : null}

        {event.sourceTag ? (
          <Text style={styles.metaChip}>{event.sourceTag}</Text>
        ) : null}

        <Text style={styles.startTime}>{formatStartTime(event.startsAt)}</Text>
      </View>

      <Text style={styles.sectionTitle}>
        Select a source  ·  {embeds.length} available
      </Text>
    </View>
  ), [event, state, embeds.length, handleBack]);

  // ── Error state ────────────────────────────────────────────────────────────
  if (embedsError && embeds.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ScrollView contentContainerStyle={styles.errorContainer}>
          {EventInfoBanner}
          <Text style={styles.errorText}>⚠  {embedsError}</Text>
          <Pressable
            focusable={true}
            onPress={() => fetchEmbeds(routeEvent)}
            style={({ focused }) => [styles.retryBtn, focused && styles.retryBtnFocused]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading streams"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {embedsLoading ? (
        // Loading state — show event banner + spinner
        <ScrollView>
          {EventInfoBanner}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.sky} />
            <Text style={styles.loadingText}>
              Fetching sources for "{event.name}"…
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList<AppEmbed>
          data={embeds}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={EventInfoBanner}

          // ── Performance tuning ─────────────────────────────────────────
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={100}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}

          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.bg,
  },

  // ── Event info banner ─────────────────────────────────────────────────────
  eventBanner: {
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    alignSelf:    'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.sm,
  },
  backBtnFocused: {
    backgroundColor: Colors.sky + '22',
  },
  backBtnText: {
    fontSize:   FontSize.base,
    color:      Colors.sky,
    fontWeight: '600',
  },
  eventName: {
    fontSize:     FontSize.lg,
    fontWeight:   '700',
    color:        Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    alignItems:    'center',
    gap:           Spacing.xs,
    marginBottom:  Spacing.md,
  },
  statePill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
  },
  statePillText: {
    fontSize:     FontSize.xs,
    fontWeight:   '700',
    letterSpacing: 0.5,
  },
  metaChip: {
    fontSize:          FontSize.xs,
    color:             Colors.textMuted,
    backgroundColor:   Colors.bg,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  startTime: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    marginLeft: 'auto',
  },
  sectionTitle: {
    fontSize:   FontSize.sm,
    fontWeight: '700',
    color:      Colors.sky,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: Spacing.xxl,
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: {
    paddingTop: Spacing.xxl,
    alignItems: 'center',
    gap:        Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.base,
    color:    Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorContainer: {
    flexGrow: 1,
  },
  errorText: {
    fontSize:  FontSize.base,
    color:     Colors.rose,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  retryBtn: {
    alignSelf:   'center',
    marginTop:   Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.sky,
    borderRadius: Radius.sm,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  retryBtnFocused: {
    backgroundColor: Colors.sky + '22',
  },
  retryText: {
    fontSize:   FontSize.base,
    color:      Colors.sky,
    fontWeight: '600',
  },
});
