import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import GradientPressable from '../src/components/GradientPressable';

const bg = require('../assets/onboarding-bg.jpg');

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={bg}
      style={styles.bg}
      imageStyle={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>FloodSight HCM</Text>
            <Text style={styles.subtitle}>
              Theo dõi ngập lụt theo thời gian thực và nhận cảnh báo sớm.
            </Text>
          </View>

          <View style={styles.ctaBlock}>
            <GradientPressable style={styles.primaryBtn} onPress={() => router.push('/login')}>
              <Text style={styles.primaryText}>Đăng nhập</Text>
            </GradientPressable>

            <Pressable style={styles.ghostBtn} onPress={() => router.push('/register')}>
              <Text style={styles.ghostText}>Đăng ký</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%'
  },
  bgImage: {
    width: '100%',
    height: '100%'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 21, 58, 0.52)'
  },
  safe: {
    flex: 1,
    width: '100%'
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 26
  },
  textBlock: {
    marginBottom: 24
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 22
  },
  ctaBlock: {
    gap: 10
  },
  primaryBtn: {
    paddingVertical: 14,
    width: '100%'
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  ghostBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  ghostText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
