import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { fetchProfileIcons } from '../lib/api';
import type { ProfileIcon } from '../lib/profileAvatar';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  currentAvatar?: string | null;
  onClose: () => void;
  onSelect: (icon: ProfileIcon) => void;
  saving?: boolean;
};

export default function ProfileAvatarPickerModal({
  visible,
  currentAvatar,
  onClose,
  onSelect,
  saving = false
}: Props) {
  const [icons, setIcons] = useState<ProfileIcon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchProfileIcons();
        if (!cancelled) setIcons(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Chọn ảnh đại diện</Text>
            <Pressable onPress={onClose} disabled={saving} hitSlop={8}>
              <Text style={styles.close}>Đóng</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Chọn một icon có sẵn (không tải ảnh từ máy).</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={icons}
              keyExtractor={(item) => item.name}
              numColumns={3}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const selected = currentAvatar === item.name;
                return (
                  <Pressable
                    style={[styles.iconCell, selected && styles.iconCellSelected]}
                    onPress={() => onSelect(item)}
                    disabled={saving}
                  >
                    <Image source={{ uri: item.url }} style={styles.iconImg} />
                  </Pressable>
                );
              }}
            />
          )}
          {saving ? <Text style={styles.saving}>Đang lưu...</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%'
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  close: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  hint: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  loader: { marginVertical: 24 },
  grid: { gap: 10, paddingBottom: 8 },
  gridRow: { gap: 10, justifyContent: 'flex-start' },
  iconCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#f8fafc'
  },
  iconCellSelected: {
    borderColor: '#1d4ed8',
    borderWidth: 3
  },
  iconImg: { width: '100%', height: '100%' },
  saving: {
    textAlign: 'center',
    marginTop: 8,
    color: '#64748b',
    fontSize: 13
  }
});
