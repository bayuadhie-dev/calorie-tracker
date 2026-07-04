import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { useProfileStore } from '../src/store/useProfileStore';
import { useSettingsStore } from '../src/store/useSettingsStore';



export default function RootLayout() {
  const [initError, setInitError] = useState<string | null>(null);

  console.log('[Layout] Mounting RootLayout...');

  const [fontsLoaded, fontError] = useFonts({
    'PressStart2P-Regular': PressStart2P_400Regular,
  });

  const { dbInitialized, initDatabase, loading: profileLoading } = useProfileStore();
  const { loadSettings } = useSettingsStore();

  console.log('[Layout] Current state:', {
    fontsLoaded,
    fontError: fontError ? fontError.message : null,
    dbInitialized,
    profileLoading
  });

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[Layout] Initializing database...');
        await initDatabase();
        console.log('[Layout] Database initialized.');

        console.log('[Layout] Loading settings...');
        await loadSettings();
        console.log('[Layout] Settings loaded.');
      } catch (e: any) {
        console.error('[Layout] Init error:', e);
        setInitError(e?.message || String(e));
      }
    };
    init();
  }, []);

  // Show font error
  if (fontError) {
    console.log('[Layout] Rendering Font Error screen');
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>FONT ERROR</Text>
        <ScrollView>
          <Text style={styles.errorText}>{fontError.message}</Text>
        </ScrollView>
      </View>
    );
  }

  // Show init error
  if (initError) {
    console.log('[Layout] Rendering DB Init Error screen');
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>DB INIT ERROR</Text>
        <ScrollView>
          <Text style={styles.errorText}>{initError}</Text>
        </ScrollView>
      </View>
    );
  }

  // Show loading
  if (!fontsLoaded || !dbInitialized) {
    console.log('[Layout] Rendering LOADING DATABASE screen...');
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <Text style={styles.loadingText}>LOADING DATABASE...</Text>
        <ActivityIndicator size="large" color="#000000" style={{ marginTop: 20 }} />
      </View>
    );
  }

  console.log('[Layout] Rendering Stack Navigator...');
  return (
    <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFF0F0',
    padding: 20,
    paddingTop: 60,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CC0000',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});
