import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateReportForm from '../../src/components/CreateReportForm';
import ReportDetailSheet from '../../src/components/ReportDetailSheet';
import { useAuth } from '../../src/context/AuthContext';
import {
  type CrowdReport,
  fetchAllReports,
  formatReportListTime,
  MODERATION_LABELS
} from '../../src/lib/reportsApi';
import { getFloodLevelBadgeLabel, getFloodLevelColor } from '../../src/lib/floodLevels';
import { useTabBarContentInset } from '../../src/constants/tabBarLayout';
import TabHeaderGradient from '../../src/components/TabHeaderGradient';
import {
  curvedBodySection,
  curvedHeaderText,
  curvedTabScreen
} from '../../src/components/curvedTabScreen';
import { colors } from '../../src/theme';

type FilterKey = 'all' | 'pending' | 'approved' | 'rejected';
type ScreenMode = 'create' | 'list';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' }
];

const TAB_INDICATOR_INSET = 16;

const MODE_TABS: { key: ScreenMode; label: string }[] = [
  { key: 'create', label: 'Tạo báo cáo' },
  { key: 'list', label: 'Danh sách' }
];

function ReportModeTabs({
  mode,
  onModeChange
}: {
  mode: ScreenMode;
  onModeChange: (next: ScreenMode) => void;
}) {
  const slide = useRef(new Animated.Value(mode === 'create' ? 0 : 1)).current;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: mode === 'create' ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 11
    }).start();
  }, [mode, slide]);

  const tabWidth = barWidth / MODE_TABS.length;
  const indicatorWidth = Math.max(0, tabWidth - TAB_INDICATOR_INSET * 2);
  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [TAB_INDICATOR_INSET, tabWidth + TAB_INDICATOR_INSET]
  });

  return (
    <View
      style={styles.modeBar}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {MODE_TABS.map((tab) => (
        <Pressable
          key={tab.key}
          style={styles.modeTab}
          onPress={() => onModeChange(tab.key)}
        >
          <Text style={[styles.modeTabText, mode === tab.key && styles.modeTabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
      {barWidth > 0 ? (
        <Animated.View
          style={[
            styles.modeTabIndicator,
            { width: indicatorWidth, transform: [{ translateX }] }
          ]}
        />
      ) : null}
    </View>
  );
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

export default function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState<ScreenMode>('create');
  const [reports, setReports] = useState<CrowdReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<CrowdReport | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllReports();
      setReports(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được báo cáo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'list') return undefined;
    void load();
    const iv = setInterval(() => {
      void load(true);
    }, 15000);
    return () => clearInterval(iv);
  }, [load, mode]);

  const displayName = useMemo(
    () => pickDisplayName(user, isAuthenticated),
    [user, isAuthenticated]
  );
  const tabBarInset = useTabBarContentInset();

  return (
    <View style={styles.container}>
      <View style={[styles.topSection, { paddingTop: insets.top + 12 }]}>
        <TabHeaderGradient />
        <Text style={[curvedHeaderText.topTitle, styles.topTitleSpacing]}>Báo cáo</Text>
        {isLoading ? (
          <ActivityIndicator color="#ffffff" style={styles.greetingLoader} />
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
        <ReportModeTabs mode={mode} onModeChange={setMode} />

        <View style={[styles.modePane, mode !== 'create' && styles.modePaneHidden]}>
          <CreateReportForm onSuccess={() => setMode('list')} />
        </View>
        <View style={[styles.modePane, mode !== 'list' && styles.modePaneHidden]}>
          <ReportsList
            isAuthenticated={isAuthenticated}
            router={router}
            loading={loading}
            refreshing={refreshing}
            error={error}
            reports={reports}
            filter={filter}
            onFilter={setFilter}
            onLoad={load}
            onSelect={setSelected}
            tabBarInset={tabBarInset}
          />
        </View>
      </View>

      <ReportDetailSheet
        visible={selected != null}
        report={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function ReportsList({
  isAuthenticated,
  router,
  loading,
  refreshing,
  error,
  reports,
  filter,
  onFilter,
  onLoad,
  onSelect,
  tabBarInset
}: {
  isAuthenticated: boolean;
  router: ReturnType<typeof useRouter>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reports: CrowdReport[];
  filter: FilterKey;
  onFilter: (f: FilterKey) => void;
  onLoad: (isRefresh?: boolean) => void;
  onSelect: (r: CrowdReport) => void;
  tabBarInset: number;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    const pending = reports.filter((r) => r.moderation_status === 'pending').length;
    const approved = reports.filter((r) => r.moderation_status === 'approved').length;
    const rejected = reports.filter((r) => r.moderation_status === 'rejected').length;
    return {
      all: reports.length,
      pending,
      approved,
      rejected
    };
  }, [reports]);

  const filtered = useMemo(() => {
    let rows =
      filter === 'all' ? reports : reports.filter((r) => r.moderation_status === filter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [
        String(r.id),
        r.reporter_name,
        r.location_description,
        r.content,
        r.description,
        r.flood_level
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [reports, filter, searchQuery]);

  const filterButtons = useMemo(
    () =>
      FILTERS.map((f) => ({
        ...f,
        count: counts[f.key]
      })),
    [counts]
  );

  const listHeader = (
    <View style={styles.listHeader}>
      {!isAuthenticated ? (
        <View style={styles.authBanner}>
          <Text style={styles.authBannerText}>
            Đăng nhập để xem đầy đủ báo cáo (mọi trạng thái).
          </Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.authLink}>Đăng nhập</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Tìm báo cáo..."
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filterRow}>
        {filterButtons.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
              onPress={() => onFilter(f.key)}
            >
              <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>
                {f.label} {f.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{counts.all}</Text>
          <Text style={styles.statLabel}>Tổng báo cáo</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.statValuePending]}>{counts.pending}</Text>
          <Text style={styles.statLabel}>Chờ duyệt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.statValueApproved]}>{counts.approved}</Text>
          <Text style={styles.statLabel}>Đã duyệt</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => onLoad()}>
            <Text style={styles.retry}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const showInitialLoader = loading && reports.length === 0;
  const listEmpty = showInitialLoader ? (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  ) : (
    <Text style={styles.empty}>
      {searchQuery.trim() ? 'Không tìm thấy báo cáo phù hợp.' : 'Không có báo cáo nào.'}
    </Text>
  );

  return (
    <FlatList
      style={styles.listScreen}
      data={showInitialLoader ? [] : filtered}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={listHeader}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => onLoad(true)} />
      }
      contentContainerStyle={[
        showInitialLoader || filtered.length === 0 ? styles.emptyList : styles.list,
        { paddingBottom: tabBarInset + 16 }
      ]}
      ListEmptyComponent={listEmpty}
      renderItem={({ item }) => <ReportRow report={item} onPress={() => onSelect(item)} />}
      removeClippedSubviews={Platform.OS !== 'web'}
    />
  );
}

const STATUS_STYLES: Record<
  string,
  { bg: string; dot: string; text: string }
> = {
  approved: { bg: '#ecfdf5', dot: '#16a34a', text: '#15803d' },
  pending: { bg: '#fff7ed', dot: '#ea580c', text: '#c2410c' },
  rejected: { bg: '#fef2f2', dot: '#dc2626', text: '#b91c1c' }
};

function ReportRow({
  report,
  onPress
}: {
  report: CrowdReport;
  onPress: () => void;
}) {
  const mod = report.moderation_status ?? '';
  const modLabel = MODERATION_LABELS[mod] ?? mod ?? '—';
  const statusStyle = STATUS_STYLES[mod] ?? {
    bg: '#f1f5f9',
    dot: '#94a3b8',
    text: '#64748b'
  };
  const levelColor = getFloodLevelColor(report.flood_level, colors.primary);
  const location =
    report.location_description?.trim() ||
    (Number.isFinite(report.lat) && Number.isFinite(report.lng)
      ? `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`
      : '—');

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={styles.rowId}>#{report.id}</Text>
        <View style={[styles.levelPill, { backgroundColor: `${levelColor}18` }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>
            {getFloodLevelBadgeLabel(report.flood_level)}
          </Text>
        </View>
      </View>

      <View style={styles.rowLine}>
        <Ionicons name="person-outline" size={15} color="#94a3b8" />
        <Text style={styles.rowLineText} numberOfLines={1}>
          {report.reporter_name || 'Ẩn danh'} · {formatReportListTime(report.created_at)}
        </Text>
      </View>

      <View style={styles.rowLine}>
        <Ionicons name="location-outline" size={15} color="#94a3b8" />
        <Text style={styles.rowLineText} numberOfLines={2}>
          {location}
        </Text>
      </View>

      <View style={styles.rowBottom}>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{modLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      </View>
    </Pressable>
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
  topTitleSpacing: { marginBottom: 8 },
  greetingLoader: { marginTop: 12 },
  greetingBlock: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    zIndex: 2
  },
  bodySection: curvedBodySection('#f2f2f7'),
  listScreen: { flex: 1, backgroundColor: '#f2f2f7' },
  listHeader: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 16
  },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f7',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    position: 'relative'
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    position: 'relative'
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8'
  },
  modeTabTextActive: {
    color: '#2563eb',
    fontWeight: '700'
  },
  modeTabIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#2563eb'
  },
  modePane: { flex: 1 },
  modePaneHidden: {
    display: 'none',
    flex: 0,
    height: 0,
    overflow: 'hidden'
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  authBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  authBannerText: { flex: 1, fontSize: 13, color: colors.text },
  authLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    minHeight: 44
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 10
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8
  },
  filterBtnActive: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1'
  },
  filterBtnText: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  filterBtnTextActive: { fontWeight: '700', color: '#0f172a' },
  statsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 8
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  statValuePending: { color: '#ea580c' },
  statValueApproved: { color: '#16a34a' },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center'
  },
  errorBox: {
    alignSelf: 'stretch',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10
  },
  errorText: { color: colors.danger, fontSize: 13 },
  retry: { marginTop: 6, color: colors.primary, fontWeight: '600' },
  list: { paddingBottom: 24, gap: 10 },
  emptyList: { flexGrow: 1, paddingBottom: 40 },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
    marginHorizontal: 16
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginBottom: 10
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10
  },
  rowId: { fontWeight: '800', fontSize: 17, color: '#0f172a' },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '58%'
  },
  levelText: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8
  },
  rowLineText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' }
});
