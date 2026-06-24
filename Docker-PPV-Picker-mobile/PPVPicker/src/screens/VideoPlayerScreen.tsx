// ─────────────────────────────────────────────────────────────────────────────
// src/screens/VideoPlayerScreen.tsx
// Screen 3 of 3 — Edge-to-edge WebView player.
// Fortified with anti-popup redirection shields for Fire TV manual clicking.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors, FontSize, Spacing } from '../components/theme';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

// This script aggressively intercepts and neutralizes popup creation lines 
// (window.open, target links, form submissions) before they break out.
const POPUP_SHIELD_JS = `
  (function() {
    function injectShield() {
      // 1. Defuse frame sandboxing constraints
      try {
        Object.defineProperty(window, 'frameElement', { get: function() { return null; } });
      } catch(e){}

      var frames = document.querySelectorAll('iframe, frame');
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].hasAttribute('sandbox')) {
          frames[i].removeAttribute('sandbox');
        }
      }

      // 2. ANTI-POPUP SHIELD: Neutralize window opening APIs completely
      window.open = function() { return null; };
      if (window.top) window.top.open = function() { return null; };
      
      // 3. Forcibly overwrite any target elements trying to open new tabs
      var links = document.querySelectorAll('a[target="_blank"], form[target="_blank"]');
      for (var j = 0; j < links.length; j++) {
        links[j].setAttribute('target', '_self');
      }
    }

    injectShield();
    document.addEventListener('DOMContentLoaded', injectShield);
    window.addEventListener('load', injectShield);
    setInterval(injectShield, 1000); // Continuous loop handles late arriving ad networks
  })();
  true;
`;

export default function VideoPlayerScreen({ navigation, route }: Props) {
  const { embed } = route.params;
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Capture original player domain root to keep redirection checks grounded
  const playerUrl = embed.iframeUrl;
  const rootDomainRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const match = playerUrl.match(/^https?:\/\/[^\/]+/);
      if (match) rootDomainRef.current = match[0];
    } catch (e) {}
  }, [playerUrl]);

  // ── Hardware Remote Back Button Support ──
  useEffect(() => {
    const onBackPress = () => {
      navigation.goBack();
      return true;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [navigation]);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setLoadError(null);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback((syntheticEvent: { nativeEvent: { description?: string } }) => {
    const { description } = syntheticEvent.nativeEvent;
    setLoading(false);
    setLoadError(description ?? 'Unknown WebView error');
  }, []);

  // ── ADVANCED WEB NAVIGATION COMPILER TRAFFIC INTERCEPTOR ──
  const handleShouldStartLoadWithRequest = useCallback((request: any) => {
    const targetUrl = request.url;

    // Always allow the base loading operations or direct player resource packets
    if (targetUrl === playerUrl || targetUrl === 'about:blank') {
      return true;
    }

    // Block completely if the redirect target doesn't match the stream provider host domain
    if (rootDomainRef.current && !targetUrl.startsWith(rootDomainRef.current)) {
      console.log(`[Popup Shield Blocked Redirect Target]: ${targetUrl}`);
      return false; // Drops the hidden pop-under or script-triggered window switch
    }

    return true;
  }, [playerUrl]);

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />

      <View style={styles.webviewContainer}>
        {loadError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠  Player failed to load</Text>
            <Text style={styles.errorDetail}>{loadError}</Text>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ uri: playerUrl }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            databaseEnabled={true}
            mediaPlaybackRequiresUserAction={true} // Safe manual interaction trigger mode
            allowsInlineMediaPlayback={true}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            style={styles.webview}
            
            // ── POPUP PROTECTION FILTER LAYERS ──
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            setSupportMultipleWindows={false} // Commands Android OS to discard split window payloads
            
            // ── SCRIPT INJECTIONS ──
            injectedJavaScriptBeforeContentLoaded={POPUP_SHIELD_JS}
            injectedJavaScript={POPUP_SHIELD_JS}
            
            // ── NATIVE SYSTEM SETTINGS ──
            allowsFullscreenVideo={true}
            mixedContentMode="always"
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
            originWhitelist={['*']}
            thirdPartyCookiesEnabled={true}
            textZoom={100}
            
            // Safe mobile device browser footprint signature
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
          />
        )}

        {loading && !loadError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.sky} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent', // Retain clean visibility layer so manual clicking clicks through accurately
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.black,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.rose,
    fontWeight: '600',
  },
  errorDetail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
