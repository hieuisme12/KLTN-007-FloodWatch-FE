import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import ReportDetailSheet from '../../src/components/ReportDetailSheet';
import { useAuth } from '../../src/context/AuthContext';
import {
  type CrowdReport,
  fetchAllReports,
  formatReportDate,
  FLOOD_LEVEL_COLORS,
  getReportContent,
  MODERATION_COLORS,
  MODERATION_LABELS
} from '../../src/lib/reportsApi';
import { colors } from '../../src/theme';

type FilterKey = 'all' | 'pending' | 'approved' | 'rejected';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' }
];

export default function ReportsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
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
    load();
    const iv = setInterval(() => load(true), 15000);
    return () => clearInterval(iv);
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter((r) => r.moderation_status === filter);
  }, [reports, filter]);

  if (loading && reports.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isAuthenticated && (
        <View style={styles.authBanner}>
          <Text style={styles.authBannerText}>
            Đăng nhập để xem đầy đủ báo cáo (mọi trạng thái).
          </Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.authLink}>Đăng nhập</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()}>
            <Text style={styles.retry}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Không có báo cáo nào.</Text>
        }
        renderItem={({ item }) => (
          <ReportRow report={item} onPress={() => setSelected(item)} />
        )}
      />

      <ReportDetailSheet
        visible={selected != null}
        report={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function ReportRow({
  report,
  onPress
}: {
  report: CrowdReport;
  onPress: () => void;
}) {
  const mod = report.moderation_status ?? '';
  const modColor = MODERATION_COLORS[mod] ?? colors.textMuted;
  const modLabel = MODERATION_LABELS[mod] ?? mod;
  const levelColor = FLOOD_LEVEL_COLORS[report.flood_level ?? ''] ?? colors.primary;
  const snippet = getReportContent(report);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={styles.rowId}>#{report.id}</Text>
        <View style={[styles.levelPill, { backgroundColor: `${levelColor}22` }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>
            {report.flood_level || '—'}
          </Text>
        </View>
      </View>
      <Text style={styles.rowMeta} numberOfLines={1}>
        {report.reporter_name || 'Ẩn danh'} · {formatReportDate(report.created_at)}
      </Text>
      {snippet ? (
        <Text style={styles.rowSnippet} numberOfLines={2}>
          {snippet}
        </Text>
      ) : null}
      <Text style={[styles.rowStatus, { color: modColor }]}>{modLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  filters: { padding: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  errorBox: { padding: 12, backgroundColor: '#fef2f2' },
  errorText: { color: colors.danger, fontSize: 13 },
  retry: { marginTop: 6, color: colors.primary, fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  empty: { textAlign: 'center', color: colors.textMuted },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  rowId: { fontWeight: '700', fontSize: 15, color: colors.text },
  levelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  levelText: { fontSize: 12, fontWeight: '700' },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  rowSnippet: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 6 },
  rowStatus: { fontSize: 13, fontWeight: '600' }
});
