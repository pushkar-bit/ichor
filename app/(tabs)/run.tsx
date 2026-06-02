import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Linking,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { PlayCircle, PauseCircle, StopCircle, Map, Satellite } from 'lucide-react-native';
import { useAppStore } from '../../stores/useAppStore';
import { useRunTracker, GpsAccuracy } from '../../hooks/useRunTracker';
import { formatPace, formatDuration } from '../../utils/paceCalculator';
import { Colors } from '../../constants/colors';

// ─── GPS Accuracy Badge ────────────────────────────────────────────────────────

const ACCURACY_CONFIG: Record<GpsAccuracy, { label: string; color: string }> = {
  Excellent: { label: 'Excellent', color: '#10B981' },
  Good:      { label: 'Good',      color: '#F59E0B' },
  Poor:      { label: 'Poor',      color: '#EF4444' },
  Searching: { label: 'Searching', color: '#6B7280' },
};

function GpsAccuracyBadge({ accuracy }: { accuracy: GpsAccuracy }) {
  const { label, color } = ACCURACY_CONFIG[accuracy];
  return (
    <View style={[styles.gpsBadge, { borderColor: color }]}>
      <View style={[styles.gpsDot, { backgroundColor: color }]} />
      <Text style={[styles.gpsBadgeText, { color }]}>GPS: {label}</Text>
    </View>
  );
}

// ─── Split Toast ───────────────────────────────────────────────────────────────

function SplitToast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const prevVisible = useRef(false);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
    prevVisible.current = visible;
  }, [visible, opacity]);

  return (
    <Animated.View style={[styles.splitToast, { opacity }]}>
      <Text style={styles.splitToastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Stop Button — 2-second hold to confirm ────────────────────────────────────

function HoldToStopButton({ onStop }: { onStop: () => void }) {
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);

  const onPressIn = () => {
    setHolding(true);
    holdAnim.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        onStop();
        holdProgress.setValue(0);
        setHolding(false);
      }
    });
  };

  const onPressOut = () => {
    holdAnim.current?.stop();
    setHolding(false);
    Animated.timing(holdProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const buttonSize = holdProgress.interpolate({ inputRange: [0, 1], outputRange: [56, 72] });

  return (
    <View style={styles.stopWrapper}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.stopButton, { width: buttonSize, height: buttonSize }]}>
          <StopCircle size={26} color="white" />
        </Animated.View>
      </Pressable>
      <Text style={styles.stopLabel}>{holding ? 'Release…' : 'Hold to stop'}</Text>
    </View>
  );
}

// ─── Pre-Run Screen ────────────────────────────────────────────────────────────

function PreRunScreen({
  gpsAccuracy,
  permissionStatus,
  onStart,
}: {
  gpsAccuracy: GpsAccuracy;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  onStart: (type: 'SOLO' | 'GROUP') => void;
}) {
  const [runType, setRunType] = useState<'SOLO' | 'GROUP'>('SOLO');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={styles.preRunContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionBody}>
            Dhaav needs location access to track your run and claim territory. Please enable it in Settings.
          </Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.preRunContainer}>
      <View style={styles.preRunHeader}>
        <Text style={styles.preRunTitle}>Ready to Run?</Text>
        <GpsAccuracyBadge accuracy={gpsAccuracy} />
      </View>

      {/* Run Type Toggle */}
      <View style={styles.runTypeContainer}>
        {(['SOLO', 'GROUP'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.runTypePill, runType === type && styles.runTypePillActive]}
            onPress={() => setRunType(type)}
          >
            <Text style={[styles.runTypePillText, runType === type && styles.runTypePillTextActive]}>
              {type === 'SOLO' ? '🏃 Solo Run' : '👥 Group Run'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Animated START button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.startButton, gpsAccuracy === 'Searching' && { opacity: 0.6 }]}
          onPress={() => onStart(runType)}
          disabled={gpsAccuracy === 'Searching'}
          activeOpacity={0.85}
        >
          <PlayCircle size={52} color="white" />
          <Text style={styles.startButtonText}>START</Text>
        </TouchableOpacity>
      </Animated.View>

      {gpsAccuracy === 'Searching' && (
        <Text style={styles.waitingText}>Acquiring GPS signal…</Text>
      )}
    </SafeAreaView>
  );
}

// ─── Active Run Screen ─────────────────────────────────────────────────────────

function ActiveRunScreen({
  onStop,
  onPause,
  onResume,
  splitMessage,
  splitVisible,
}: {
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  splitMessage: string;
  splitVisible: boolean;
}) {
  const { coordinates, distance, pace, duration, calories, isPaused } = useAppStore();
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  // Follow runner on map
  useEffect(() => {
    const last = coordinates[coordinates.length - 1];
    if (last && mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: last.latitude, longitude: last.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 },
        500,
      );
    }
  }, [coordinates]);

  const initialRegion = coordinates[0]
    ? { latitude: coordinates[0].latitude, longitude: coordinates[0].longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={styles.activeRunContainer}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {coordinates.length > 1 && (
          <Polyline coordinates={coordinates} strokeColor={Colors.brand.primary} strokeWidth={4} />
        )}
      </MapView>

      {/* Satellite / Standard toggle */}
      <TouchableOpacity
        style={styles.mapToggle}
        onPress={() => setMapType((t) => (t === 'standard' ? 'satellite' : 'standard'))}
      >
        {mapType === 'standard' ? <Satellite size={20} color="white" /> : <Map size={20} color="white" />}
      </TouchableOpacity>

      {/* Split km toast */}
      <SplitToast message={splitMessage} visible={splitVisible} />

      {/* HUD panel — plain dark view (no expo-blur required) */}
      <View style={styles.hud}>
        {/* Stats row */}
        <View style={styles.hudRow}>
          <View style={styles.hudStat}>
            <Text style={styles.hudStatValueLarge}>{distance.toFixed(2)}</Text>
            <Text style={styles.hudStatLabel}>km</Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudStat}>
            <Text style={styles.hudStatValue}>{formatPace(pace)}</Text>
            <Text style={styles.hudStatLabel}>pace</Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudStat}>
            <Text style={styles.hudStatValue}>{formatDuration(duration)}</Text>
            <Text style={styles.hudStatLabel}>time</Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudStat}>
            <Text style={styles.hudStatValue}>{calories}</Text>
            <Text style={styles.hudStatLabel}>kcal</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.hudControls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: isPaused ? '#F59E0B' : '#3A3A3A' }]}
            onPress={isPaused ? onResume : onPause}
          >
            {isPaused
              ? <PlayCircle size={26} color="white" />
              : <PauseCircle size={26} color="white" />}
            <Text style={styles.controlLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>

          <HoldToStopButton onStop={onStop} />
        </View>
      </View>
    </View>
  );
}

// ─── Main Run Screen ───────────────────────────────────────────────────────────

export default function RunScreen() {
  const router = useRouter();
  const { isRunning } = useAppStore();

  const [splitMessage, setSplitMessage] = useState('');
  const [splitVisible, setSplitVisible] = useState(false);

  const handleSplitKm = useCallback((km: number, paceStr: string) => {
    setSplitMessage(`🏁 ${km} km  –  ${paceStr}`);
    setSplitVisible(true);
    setTimeout(() => setSplitVisible(false), 3500);
  }, []);

  const tracker = useRunTracker(handleSplitKm);

  useEffect(() => {
    tracker.requestPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(
    (_type: 'SOLO' | 'GROUP') => tracker.start(),
    [tracker],
  );

  const handleStop = useCallback(async () => {
    const finalStats = await tracker.stop();
    router.push({
      pathname: '/run-summary',
      params: { stats: JSON.stringify(finalStats) },
    });
  }, [tracker, router]);

  if (!isRunning) {
    return (
      <PreRunScreen
        gpsAccuracy={tracker.gpsAccuracy}
        permissionStatus={tracker.permissionStatus}
        onStart={handleStart}
      />
    );
  }

  return (
    <ActiveRunScreen
      onStop={handleStop}
      onPause={tracker.pause}
      onResume={tracker.resume}
      splitMessage={splitMessage}
      splitVisible={splitVisible}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Pre-run
  preRunContainer: {
    flex: 1, backgroundColor: '#1A1A1A', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 24, gap: 32,
  },
  preRunHeader: { alignItems: 'center', gap: 12 },
  preRunTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  gpsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsBadgeText: { fontSize: 13, fontWeight: '600' },
  runTypeContainer: { flexDirection: 'row', gap: 12 },
  runTypePill: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
    backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#333',
  },
  runTypePillActive: { backgroundColor: '#E8520A', borderColor: '#E8520A' },
  runTypePillText: { color: '#A0A0A0', fontSize: 15, fontWeight: '600' },
  runTypePillTextActive: { color: '#FFFFFF' },
  startButton: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#E8520A', alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: '#E8520A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  waitingText: { color: '#6B7280', fontSize: 13, marginTop: -16 },
  permissionCard: {
    backgroundColor: '#2A2A2A', borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 16,
  },
  permissionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  permissionBody: { color: '#A0A0A0', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  settingsButton: {
    backgroundColor: '#E8520A', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 12, marginTop: 8,
  },
  settingsButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Active run
  activeRunContainer: { flex: 1 },
  mapToggle: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 16, right: 16,
    backgroundColor: 'rgba(26,26,26,0.85)', padding: 10,
    borderRadius: 12, borderWidth: 1, borderColor: '#444',
  },
  splitToast: {
    position: 'absolute', bottom: 230, alignSelf: 'center',
    backgroundColor: 'rgba(232,82,10,0.95)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
  },
  splitToastText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // HUD (dark translucent panel — no expo-blur)
  hud: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(18,18,18,0.93)',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 20, paddingHorizontal: 16,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  hudRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 20,
  },
  hudStat: { flex: 1, alignItems: 'center', gap: 2 },
  hudStatValueLarge: { color: '#FFFFFF', fontSize: 44, fontWeight: '800' },
  hudStatValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  hudStatLabel: {
    color: '#A0A0A0', fontSize: 11, fontWeight: '500', textTransform: 'uppercase',
  },
  hudDivider: { width: 1, height: 44, backgroundColor: '#333' },
  hudControls: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 24,
  },
  controlButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16,
  },
  controlLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  // Stop button
  stopWrapper: { alignItems: 'center', gap: 4 },
  stopButton: {
    backgroundColor: '#EF4444', borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  stopLabel: { color: '#A0A0A0', fontSize: 11 },
});
