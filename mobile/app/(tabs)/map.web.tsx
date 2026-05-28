import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
/** Web stub — react-native-maps chỉ chạy trên iOS/Android. */
export default function RoutingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.card}>
        <Text style={styles.title}>Tìm đường trên bản đồ</Text>
        <Text style={styles.desc}>
          Tính năng bản đồ native chưa hỗ trợ trên trình duyệt. Mở app bằng Expo Go trên điện thoại
          (quét QR trong terminal) hoặc nhấn phím a để chạy Android emulator.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f9ff', padding: 16 },
  card: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8
  },
  title: { color: '#9a3412', fontSize: 17, fontWeight: '700' },
  desc: { color: '#7c2d12', fontSize: 14, lineHeight: 20 }
});
