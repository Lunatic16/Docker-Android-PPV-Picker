// ─────────────────────────────────────────────────────────────────────────────
// src/screens/EventListScreen.tsx
// Screen 1 of 3 — Event index with live-filter search + D-pad navigation.
//
// Performance tuning for armeabi-v7a / Android 9 low-spec hardware:
//   • initialNumToRender = 8   → renders minimal rows on first paint
//   • maxToRenderPerBatch = 5  → limits JS work per batch
//   • windowSize = 5           → keeps only 5 × screen-height of DOM nodes live
//   • removeClippedSubviews    → drops off-screen native views
//   • keyExtractor             → stable string keys avoid full re-diff
//   • getItemLayout            → skips measurement pass (fixed-height rows)
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EventCard } from '../components/EventCard';
import { Colors, FontSize, Spacing } from '../components/theme';
import { useAppStore } from '../store/useAppStore';
import type { AppEvent, RootStackParamList } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Fixed row height used by getItemLayout to skip dynamic measurement. */
const ITEM_HEIGHT = 82;

type Props = NativeStackScreenProps<RootStackParamList, 'EventList'>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EventListScreen({ navigation }: Props) {
  const events        = useAppStore(s => s.events);
  const eventsLoading = useAppStore(s => s.eventsLoading);
  const eventsError   = useAppStore(s => s.eventsError);
  const fetchEvents   = useAppStore(s => s.fetchEvents);
  const fetchEmbeds   = useAppStore(s => s.fetchEmbeds);

  const [query, setQuery] = useState('');
  const searchRef         = useRef<TextInput>(null);

  // Fetch index on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Filter logic ───────────────────────────────────────────────────────────
  // Mirrors the TTY picker filter: query.lower() in strip_ansi(row).lower()
  const filteredEvents = useMemo<AppEvent[]>(() => {
    if (!query.trim()) return events;
    const q = query.trim().toLowerCase();
    return events.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.categoryName ?? '').toLowerCase().includes(q) ||
      (e.sourceTag ?? '').toLowerCase().includes(q) ||
      (e.tag ?? '').toLowerCase().includes(q),
    );
  }, [events, query]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleEventPress = useCallback(
    async (event: AppEvent) => {
      // Start fetching embeds immediately; navigate to selection screen
      fetchEmbeds(event);
      navigation.navigate('StreamSelection', { event });
    },
    [fetchEmbeds, navigation],
  );

  // ── FlatList helpers ───────────────────────────────────────────────────────
  const keyExtractor = useCallback(
    (item: AppEvent) => String(item.id) || item.uri,
    [],
  );

  /**
   * getItemLayout allows FlatList to skip the layout measurement pass for
   * every off-screen row, which is the single biggest rendering win on
   * low-spec ARMv7 hardware. Requires all rows to have the same height.
   */
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AppEvent; index: number }) => (
      <EventCard
        event={item}
        onPress={handleEventPress}
        hasTVPreferredFocus={index === 0}
      />
    ),
    [handleEventPress],
  );

  const ListEmptyComponent = useMemo(() => {
    if (eventsLoading) return null;
    if (eventsError) {
      return (
        <View style={styles.centeredMsg}>
          <Text style={styles.errorText}>⚠  {eventsError}</Text>
          <Pressable
            focusable={true}
            style={({ focused }) => [styles.retryBtn, focused && styles.retryBtnFocused]}
            onPress={fetchEvents}
            accessibilityRole="button"
            accessibilityLabel="Retry loading events"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.centeredMsg}>
        <Text style={styles.mutedText}>No events match "{query}"</Text>
      </View>
    );
  }, [eventsLoading, eventsError, query, fetchEvents]);

  const ItemSeparatorComponent = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.bg}
        translucent={false}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>PPV Picker</Text>
          {eventsLoading && (
            <ActivityIndicator
              size="small"
              color={Colors.sky}
              style={styles.headerSpinner}
            />
          )}
          {!eventsLoading && (
            <Text style={styles.count}>
              {filteredEvents.length} / {events.length}
            </Text>
          )}
        </View>

        {/* ── Search input — mirrors "filter ›" line in the TTY picker ── */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Filter events…"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
            // On Android boxes, the D-pad can reach the search field
            focusable={true}
            accessibilityLabel="Filter events by name, category, or source"
          />
          {query.length > 0 && (
            <Pressable
              focusable={true}
              onPress={() => setQuery('')}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Column headers ─────────────────────────────────────────────── */}
      <View style={styles.columnHeader}>
        <Text style={[styles.colLabel, { flex: 1 }]}>EVENT</Text>
        <Text style={styles.colLabel}>SOURCE</Text>
        <Text style={[styles.colLabel, { textAlign: 'right' }]}>START TIME</Text>
      </View>

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {eventsLoading && events.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.sky} />
          <Text style={styles.loadingText}>Fetching event index…</Text>
        </View>
      ) : (
        /* ── Event FlatList ──────────────────────────────────────────── */
        <FlatList<AppEvent>
          data={filteredEvents}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={ItemSeparatorComponent}
          ListEmptyComponent={ListEmptyComponent}
          getItemLayout={getItemLayout}

          // ── Low-spec Android 9 / armeabi-v7a performance knobs ──────
          // Render only 8 rows on first paint to hit a fast TTI.
          initialNumToRender={8}
          // Limit each incremental batch to 5 rows to keep the JS thread
          // idle between frames and prevent ANR on slow SoCs.
          maxToRenderPerBatch={5}
          // Update at most once per 100 ms to throttle layout thrashing.
          updateCellsBatchingPeriod={100}
          // Keep only 5 × viewport of rows in the native view hierarchy.
          // Below this window native views are detached but JS state is kept.
          windowSize={5}
          // Unmount native views for off-screen cells.
          removeClippedSubviews={Platform.OS === 'android'}

          // ── Misc ────────────────────────────────────────────────────
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: Colors.bg,
    paddingTop:      Spacing.md,
    paddingBottom:   Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   Spacing.sm,
  },
  title: {
    fontSize:   FontSize.xl,
    fontWeight: '700',
    color:      Colors.sky,
    flex:       1,
  },
  headerSpinner: {
    marginLeft: Spacing.sm,
  },
  count: {
    fontSize: FontSize.sm,
    color:    Colors.textMuted,
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bgCard,
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingHorizontal: Spacing.sm,
    height:          44,
  },
  searchIcon: {
    fontSize:    FontSize.base,
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex:      1,
    fontSize:  FontSize.base,
    color:     Colors.textPrimary,
    paddingVertical: 0,   // reset Android default padding
    height:    44,
  },
  clearBtn: {
    padding: Spacing.xs,
  },
  clearBtnText: {
    fontSize: FontSize.sm,
    color:    Colors.textMuted,
  },

  // ── Column headers ────────────────────────────────────────────────────────
  columnHeader: {
    flexDirection:   'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.xs,
    backgroundColor:   Colors.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colLabel: {
    fontSize:     FontSize.xs,
    fontWeight:   '700',
    color:        Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── List ─────────────────────────────────────────────────────────────────
  listContent: {
    paddingVertical: Spacing.xs,
  },
  separator: {
    // No visible separator — spacing is handled by card margins
  },

  // ── Empty / Error / Loading ───────────────────────────────────────────────
  loadingContainer: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.base,
    color:    Colors.textSecondary,
  },
  centeredMsg: {
    paddingTop:     Spacing.xxl,
    alignItems:     'center',
    gap:            Spacing.md,
  },
  errorText: {
    fontSize:  FontSize.base,
    color:     Colors.rose,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  mutedText: {
    fontSize: FontSize.base,
    color:    Colors.textMuted,
  },
  retryBtn: {
    borderWidth:   1,
    borderColor:   Colors.sky,
    borderRadius:  6,
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
