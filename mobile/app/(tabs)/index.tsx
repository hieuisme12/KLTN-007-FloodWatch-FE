import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { MAP_POLL_MS } from '@hcm-flood/shared';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import FloodMap, { MapLoadingOverlay } from '../../src/components/FloodMap';
import MenuIcon from '../../src/components/MenuIcon';
import SearchIcon from '../../src/components/SearchIcon';
import {
  fetchMapCrowdReports,
  fetchMapSensors,
  type MapCrowdReport,
  type MapSensor
} from '../../src/lib/mapApi';
import TabHeaderGradient from '../../src/components/TabHeaderGradient';
import {
  curvedBodySection,
  curvedHeaderText,
  curvedTabScreen
} from '../../src/components/curvedTabScreen';
import { colors } from '../../src/theme';

type SearchResult =
  | { type: 'page'; id: string; title: string; subtitle: string; route: string }
  | { type: 'sensor'; id: string; title: string; subtitle: string; lat: number; lng: number }
  | { type: 'report'; id: string; title: string; subtitle: string; lat: number; lng: number };

const PAGE_SEARCH_ITEMS: Array<{ id: string; title: string; subtitle: string; route: string }> = [
  { id: 'page-home', title: 'Trang chủ', subtitle: 'Màn hình chính', route: '/(tabs)' },
  { id: 'page-map', title: 'Tìm đường', subtitle: 'Tìm tuyến tránh ngập', route: '/(tabs)/map' },
  { id: 'page-reports', title: 'Báo cáo', subtitle: 'Danh sách báo cáo', route: '/(tabs)/reports' },
  { id: 'page-profile', title: 'Tài khoản', subtitle: 'Thông tin tài khoản', route: '/(tabs)/profile' }
];

function includesText(source: string, query: string) {
  return source.toLowerCase().includes(query.toLowerCase());
}

function pickDisplayName(user: Record<string, unknown> | null, isAuthenticated: boolean) {
  const candidates: Array<Record<string, unknown> | null | undefined> = [
    user,
    (user?.user as Record<string, unknown> | undefined),
    (user?.data as Record<string, unknown> | undefined),
    ((user?.data as Record<string, unknown> | undefined)?.user as
      | Record<string, unknown>
      | undefined)
  ];
  for (const item of candidates) {
    if (!item) continue;
    const value =
      (item.full_name as string) ||
      (item.fullName as string) ||
      (item.name as string) ||
      (item.display_name as string) ||
      (item.displayName as string) ||
      (item.username as string) ||
      (item.email as string);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return isAuthenticated ? 'Người dùng' : 'Khách';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [sensors, setSensors] = useState<MapSensor[]>([]);
  const [reports, setReports] = useState<MapCrowdReport[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusTarget, setFocusTarget] = useState<{
    kind: 'sensor' | 'report';
    id: string;
    lat: number;
    lng: number;
  } | null>(null);

  const loadMap = useCallback(async (showLoading = false) => {
    if (showLoading) setMapLoading(true);
    setMapError(null);
    try {
      const [sensorRows, reportRows] = await Promise.all([
        fetchMapSensors(),
        fetchMapCrowdReports()
      ]);
      setSensors(sensorRows);
      setReports(reportRows);
    } catch (e) {
      setMapError(e instanceof Error ? e.message : 'Không tải được dữ liệu bản đồ');
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMap(true);
    const sensorIv = setInterval(() => {
      fetchMapSensors().then(setSensors).catch(() => {});
    }, MAP_POLL_MS.floodData);
    const reportIv = setInterval(() => {
      fetchMapCrowdReports().then(setReports).catch(() => {});
    }, MAP_POLL_MS.crowdReports);
    return () => {
      clearInterval(sensorIv);
      clearInterval(reportIv);
    };
  }, [loadMap]);

  const displayName = useMemo(() => {
    return pickDisplayName(user, isAuthenticated);
  }, [user, isAuthenticated]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [] as SearchResult[];
    const pageResults: SearchResult[] = PAGE_SEARCH_ITEMS
      .filter((p) => includesText(`${p.title} ${p.subtitle}`, q))
      .map((p) => ({ type: 'page', ...p }));
    const sensorResults: SearchResult[] = sensors
      .filter((s) => includesText(`${s.sensor_id} ${s.location_name}`, q))
      .slice(0, 20)
      .map((s) => ({
        type: 'sensor',
        id: String(s.sensor_id),
        title: `${s.sensor_id} - ${s.location_name}`,
        subtitle: `Mực nước ${s.water_level.toFixed(1)} cm`,
        lat: s.lat,
        lng: s.lng
      }));
    const reportResults: SearchResult[] = reports
      .filter((r) => includesText(`${r.reporter_name || ''} ${r.flood_level || ''} ${r.id}`, q))
      .slice(0, 20)
      .map((r) => ({
        type: 'report',
        id: String(r.id),
        title: `Báo cáo #${r.id}`,
        subtitle: `${r.reporter_name || 'Người dân'} · ${r.flood_level || 'Ngập'}`,
        lat: r.lat,
        lng: r.lng
      }));
    return [...pageResults, ...sensorResults, ...reportResults];
  }, [searchQuery, sensors, reports]);

  function handlePickResult(item: SearchResult) {
    if (item.type === 'page') {
      setSearchOpen(false);
      setSearchQuery('');
      router.push(item.route as never);
      return;
    }
    setFocusTarget({
      kind: item.type,
      id: item.id,
      lat: item.lat,
      lng: item.lng
    });
    setSearchOpen(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topSection, { paddingTop: insets.top + 12 }]}>
        <TabHeaderGradient />
        <View style={styles.topBar}>
          <Text style={curvedHeaderText.topTitle}>Trang chủ</Text>
          <View style={styles.topActions}>
            <Pressable style={styles.topActionBtn} hitSlop={8} onPress={() => setSearchOpen(true)}>
              <SearchIcon size={20} color="#ffffff" strokeWidth={2.2} />
            </Pressable>
            <Pressable style={styles.topActionBtn} hitSlop={8}>
              <MenuIcon size={20} color="#ffffff" strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.greetingBlock}>
            <Text style={curvedHeaderText.cardLabel}>Xin chào</Text>
            <Text style={curvedHeaderText.cardValue}>{displayName}</Text>
            {!isAuthenticated ? (
              <Pressable
                style={curvedHeaderText.primaryButton}
                onPress={() => router.push('/login')}
              >
                <Text style={curvedHeaderText.primaryButtonText}>Đăng nhập</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.bodySection}>
        {mapError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{mapError}</Text>
            <Pressable onPress={() => loadMap(true)} hitSlop={8}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.mapWrap}>
          <FloodMap sensors={sensors} reports={reports} focusTarget={focusTarget} />
          {mapLoading ? <MapLoadingOverlay /> : null}
        </View>
      </View>

      <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
        <View style={styles.searchOverlay}>
          <View style={styles.searchPanel}>
            <View style={styles.searchPanelHead}>
              <Text style={styles.searchTitle}>Tìm kiếm nhanh</Text>
              <Pressable onPress={() => setSearchOpen(false)} hitSlop={8}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm trang, sensor, báo cáo..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <ScrollView style={styles.searchList}>
              {searchResults.length === 0 ? (
                <Text style={styles.emptyText}>
                  {searchQuery.trim() ? 'Không có kết quả phù hợp' : 'Nhập từ khóa để tìm kiếm'}
                </Text>
              ) : (
                searchResults.map((item) => (
                  <Pressable
                    key={`${item.type}-${item.id}`}
                    style={styles.resultRow}
                    onPress={() => handlePickResult(item)}
                  >
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultSub}>
                      {item.type === 'page'
                        ? `Trang · ${item.subtitle}`
                        : item.type === 'sensor'
                          ? `Sensor · ${item.subtitle}`
                          : `Báo cáo · ${item.subtitle}`}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e9f2fb' },
  topSection: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: curvedTabScreen.headerPaddingHorizontal,
    paddingBottom: curvedTabScreen.headerPaddingBottom
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2
  },
  topActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  topActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)'
  },
  greetingBlock: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    zIndex: 2
  },
  bodySection: curvedBodySection('#e9f2fb'),
  mapWrap: {
    flex: 1,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    overflow: 'hidden'
  },
  errorBox: {
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 8
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    paddingHorizontal: 16,
    paddingTop: 96,
    paddingBottom: 24
  },
  searchPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flex: 1
  },
  searchPanelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb'
  },
  searchInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a'
  },
  searchList: {
    marginTop: 12
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    paddingVertical: 8
  },
  resultRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#f8fafc'
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  resultSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569'
  }
});
