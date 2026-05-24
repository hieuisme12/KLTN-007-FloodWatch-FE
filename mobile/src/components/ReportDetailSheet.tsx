import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  type CrowdReport,
  formatReportDate,
  getReportContent,
  getReportPhotoUrls,
  MODERATION_COLORS,
  MODERATION_LABELS
} from '../lib/reportsApi';
import { getFloodLevelLabel } from '../lib/floodLevels';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  report: CrowdReport | null;
  onClose: () => void;
};

export default function ReportDetailSheet({ visible, report, onClose }: Props) {
  if (!report) return null;

  const content = getReportContent(report);
  const photos = getReportPhotoUrls(report);
  const modStatus = report.moderation_status ?? '';
  const modColor = MODERATION_COLORS[modStatus] ?? colors.textMuted;
  const modLabel = MODERATION_LABELS[modStatus] ?? modStatus ?? '—';

  const address =
    report.location_description?.trim() ||
    `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Chi tiết báo cáo</Text>
              <Text style={styles.subtitle}>Mã #{report.id}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Field label="Địa chỉ" value={address} />
            <Field label="Người báo cáo" value={report.reporter_name || 'Ẩn danh'} />
            <Field label="Thời gian" value={formatReportDate(report.created_at)} />
            <Field label="Mức ngập" value={getFloodLevelLabel(report.flood_level)} accent />
            {report.confidence != null ? (
              <Field label="Độ tin" value={`${report.confidence}/100`} />
            ) : null}
            {report.verified_by_sensor ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✓ Xác minh cảm biến</Text>
              </View>
            ) : null}

            {content ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Mô tả</Text>
                <Text style={styles.blockText}>{content}</Text>
              </View>
            ) : null}

            {photos.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Hình ảnh</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {photos.map((url) => (
                    <Image key={url} source={{ uri: url }} style={styles.photo} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Kiểm duyệt</Text>
              <Text style={[styles.modStatus, { color: modColor }]}>{modLabel}</Text>
              {modStatus === 'approved' && report.moderated_by_name ? (
                <Text style={styles.meta}>Người duyệt: {report.moderated_by_name}</Text>
              ) : null}
              {modStatus === 'rejected' && report.moderated_by_name ? (
                <Text style={styles.meta}>Người xử lý: {report.moderated_by_name}</Text>
              ) : null}
              {report.rejection_reason ? (
                <Text style={styles.meta}>Lý do: {report.rejection_reason}</Text>
              ) : null}
              {report.moderated_at ? (
                <Text style={styles.meta}>Thời gian: {formatReportDate(report.moderated_at)}</Text>
              ) : null}
            </View>
          </ScrollView>

          <Pressable style={styles.footerBtn} onPress={onClose}>
            <Text style={styles.footerBtnText}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, accent && styles.fieldAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end'
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: { fontSize: 18, color: colors.text, fontWeight: '600' },
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  field: { gap: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  fieldValue: { fontSize: 15, color: colors.text, lineHeight: 22 },
  fieldAccent: { fontWeight: '700', color: colors.primary },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#047857' },
  block: { gap: 6, marginTop: 4 },
  blockTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  blockText: { fontSize: 14, color: colors.text, lineHeight: 21 },
  photo: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: colors.border
  },
  modStatus: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.text, lineHeight: 20 },
  footerBtn: {
    margin: 16,
    marginTop: 0,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  footerBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 }
});
