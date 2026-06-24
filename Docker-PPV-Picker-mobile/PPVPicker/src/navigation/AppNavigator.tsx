// ─────────────────────────────────────────────────────────────────────────────
// src/navigation/AppNavigator.tsx
// React Navigation Native Stack — 3-screen layout.
//
// Stack:
//   EventList  →  StreamSelection  →  VideoPlayer
//
// Notes:
//   • headerShown=false on VideoPlayer so the WebView is fully edge-to-edge.
//   • Dark background on all screens matches the sky/amber/slate theme.
//   • animation="slide_from_right" is the default and works on armeabi-v7a
//     because the Native Stack uses the OS's built-in fragment transitions
//     (no JS-driven animation overhead on low-spec hardware).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EventListScreen       from '../screens/EventListScreen';
import StreamSelectionScreen from '../screens/StreamSelectionScreen';
import VideoPlayerScreen     from '../screens/VideoPlayerScreen';
import { Colors, FontSize }  from '../components/theme';
import type { RootStackParamList } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Stack instance
// ─────────────────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─────────────────────────────────────────────────────────────────────────────
// Navigation theme — overrides DarkTheme colours with the PPVPicker palette
// ─────────────────────────────────────────────────────────────────────────────

const AppNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:    Colors.sky,
    background: Colors.bg,
    card:       Colors.bgCard,
    text:       Colors.textPrimary,
    border:     Colors.border,
    notification: Colors.amber,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Navigator
// ─────────────────────────────────────────────────────────────────────────────

export default function AppNavigator() {
  return (
    <NavigationContainer theme={AppNavigationTheme}>
      <Stack.Navigator
        initialRouteName="EventList"
        screenOptions={{
          // Native-level slide transition — zero JS animation cost
          animation:          'slide_from_right',
          // Common header style
          headerStyle:        { backgroundColor: Colors.bgCard },
          headerTintColor:    Colors.sky,
          headerTitleStyle:   { fontSize: FontSize.md, fontWeight: '700' },
          headerBackTitleVisible: false,
          // Prevent white flash on screen push on dark AMOLED panels
          contentStyle:       { backgroundColor: Colors.bg },
        }}
      >
        {/* ── Screen 1: Event Index ───────────────────────────────────── */}
        <Stack.Screen
          name="EventList"
          component={EventListScreen}
          options={{
            // Custom header rendered inside the screen component itself
            headerShown: false,
          }}
        />

        {/* ── Screen 2: Stream / Source Selection ─────────────────────── */}
        <Stack.Screen
          name="StreamSelection"
          component={StreamSelectionScreen}
          options={({ route }) => ({
            // Custom banner rendered inside the screen component itself
            headerShown: false,
            // Prevent the user from accidentally swiping back while loading
            gestureEnabled: true,
          })}
        />

        {/* ── Screen 3: Video Player ───────────────────────────────────── */}
        <Stack.Screen
          name="VideoPlayer"
          component={VideoPlayerScreen}
          options={{
            // No native header — the screen owns the full canvas for the
            // WebView player and renders its own slim info bar.
            headerShown: false,
            // Full-screen slide keeps the native transition but hides chrome
            animation: 'slide_from_bottom',
            // Allow back-swipe to dismiss the player on iOS
            gestureEnabled: true,
            // Prevent accidental back on Android hardware back button
            // (user must tap the in-app ‹ button) — omit to allow it
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
