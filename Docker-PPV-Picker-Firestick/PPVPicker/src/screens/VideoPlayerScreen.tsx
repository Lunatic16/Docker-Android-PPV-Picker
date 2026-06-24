// ─────────────────────────────────────────────────────────────────────────────
// src/screens/VideoPlayerScreen.tsx
// Screen 3 of 3 — System Deep-Link Router.
// Handshakes directly with the native Amazon Silk Browser app.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors, FontSize, Spacing } from '../components/theme';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

export default function VideoPlayerScreen({ navigation, route }: Props) {
  const { embed } = route.params;
  const [launchError, setLaunchError] = useState<boolean>(false);
  const playerUrl = embed.iframeUrl;

  useEffect(() => {
    let active = true;

    async function launchNativeSilkBrowser() {
      try {
        // Amazon Fire TV system deep link schema format for the Silk Browser
        const silkIntentUrl = `com.amazon.cloud9.browser://open?url=${encodeURIComponent(playerUrl)}`;
        
        // Check if the specialized Silk intent can be initialized directly
        const canOpenSilk = await Linking.canOpenURL(silkIntentUrl);
        
        if (canOpenSilk && active) {
          await Linking.openURL(silkIntentUrl);
          // Bounce the user back to the catalog dashboard screen in the background.
          // When they press "Back" out of Silk, they will cleanly return to your app's list.
          navigation.goBack();
        } else {
          // Fallback: If intent schema fails, try opening via default system web handler
          const canOpenDefault = await Linking.canOpenURL(playerUrl);
          if (canOpenDefault && active) {
            await Linking.openURL(playerUrl);
            navigation.goBack();
          } else if (active) {
            setLaunchError(true);
          }
        }
      } catch (error) {
        if (active) setLaunchError(true);
      }
    }

    launchNativeSilkBrowser();

    return () => {
      active = false;
    };
  }, [playerUrl, navigation]);

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />

      {launchError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠  Unable to redirect to Silk Browser</Text>
          <Text style={styles.errorDetail}>Please ensure a web browser app is installed on this TV.</Text>
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Return to Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.sky} />
          <Text style={styles.loadingText}>Opening Stream in Silk Browser...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.rose,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    backgroundColor: Colors.sky,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 6,
  },
  backButtonText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
