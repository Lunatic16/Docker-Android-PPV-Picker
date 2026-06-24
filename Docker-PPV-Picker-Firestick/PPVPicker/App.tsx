// ─────────────────────────────────────────────────────────────────────────────
// App.tsx
// Root component — mounts the navigation tree.
// Hermes is enabled in android/app/build.gradle; no runtime flag needed here.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors }   from './src/components/theme';

export default function App() {
  return (
    <View style={styles.root}>
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.bg,
  },
});
