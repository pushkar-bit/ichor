import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Trash2, Share2 } from 'lucide-react-native';
import { useAppStore, FinalRunStats } from '../stores/useAppStore';
import { formatPace, formatDuration, encodePolyline } from '../utils/paceCalculator';
import { saveRun } from '../services/runs';

// ─── Static Map ───────────────────────────────────────────────────────────────

function StaticRunMap({ stats }: { stats: FinalRunStats }) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mapUrl = useMemo(() => {
    if (!apiKey || stats.gpxPath.length < 2) return null;
    const encoded = encodePolyline(stats.gpxPath);
    const params = new URLSearchParams({
      size: '800x300',
      maptype: 'roadmap',
      path: `color:0xE8520Aff|weight:4|enc:${encoded}`,
      key: apiKey,
      style: 'feature:all|element:labels|visibility:off',
    });
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }, [stats.gpxPath, apiKey]);

  if (!mapUrl) {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>📍 Route Map</Text>
        <Text style={styles.mapPlaceholderSub}>{stats.gpxPath.length} GPS points recorded</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: mapUrl }}
      style={styles.staticMap}
      resizeMode="cover"
    />
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Run Summary Screen ────────────────────────────────────────────────────────

export default function RunSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stats: string }>();
  const { resetRun } = useAppStore();
  const [saving, setSaving] = React.useState(false);

  const stats: FinalRunStats = useMemo(() => {
    try {
      return JSON.parse(params.stats ?? '{}') as FinalRunStats;
    } catch {
      return { gpxPath: [], distanceKm: 0, durationSeconds: 0, avgPaceMinPerKm: 0, calories: 0 };
    }
  }, [params.stats]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { runId } = await saveRun(stats);
      resetRun();
      router.replace('/(tabs)/feed');
    } catch (err) {
      Alert.alert('Save Failed', 'Could not save your run. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Run?',
      'This run will be permanently deleted.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            resetRun();
            router.replace('/(tabs)/run');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <CheckCircle size={36} color="#10B981" />
          <Text style={styles.headerTitle}>Run Complete!</Text>
          <Text style={styles.headerSub}>Great effort — here's your summary</Text>
        </View>

        {/* Static route map */}
        <StaticRunMap stats={stats} />

        {/* Primary stat — distance */}
        <View style={styles.primaryStat}>
          <Text style={styles.primaryStatValue}>{stats.distanceKm.toFixed(2)}</Text>
          <Text style={styles.primaryStatUnit}>km</Text>
        </View>

        {/* Secondary stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Duration"
            value={formatDuration(stats.durationSeconds)}
          />
          <StatCard
            label="Avg Pace"
            value={formatPace(stats.avgPaceMinPerKm)}
          />
          <StatCard
            label="Calories"
            value={`${stats.calories}`}
            sub="kcal"
          />
          <StatCard
            label="GPS Points"
            value={`${stats.gpxPath.length}`}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Share2 size={20} color="white" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save & Share'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
            <Trash2 size={18} color="#EF4444" />
            <Text style={styles.discardButtonText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  scroll: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, gap: 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  headerSub: { color: '#A0A0A0', fontSize: 14 },
  staticMap: { width: '100%', height: 200, backgroundColor: '#2A2A2A' },
  mapPlaceholder: {
    height: 180, backgroundColor: '#2A2A2A', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginHorizontal: 16, borderRadius: 16,
  },
  mapPlaceholderText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  mapPlaceholderSub: { color: '#A0A0A0', fontSize: 13 },
  primaryStat: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    paddingVertical: 24, gap: 6,
  },
  primaryStatValue: { color: '#E8520A', fontSize: 72, fontWeight: '900', lineHeight: 76 },
  primaryStatUnit: { color: '#E8520A', fontSize: 28, fontWeight: '700', paddingBottom: 8 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12,
  },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#2A2A2A', borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 2,
  },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  statSub: { color: '#A0A0A0', fontSize: 12 },
  statLabel: { color: '#6B7280', fontSize: 12, textTransform: 'uppercase', fontWeight: '500' },
  actions: { paddingHorizontal: 24, paddingTop: 32, gap: 12 },
  saveButton: {
    backgroundColor: '#E8520A', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#E8520A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  discardButton: {
    borderRadius: 16, paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#EF444433',
  },
  discardButtonText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
});
