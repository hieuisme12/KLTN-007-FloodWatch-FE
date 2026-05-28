import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import { registerWithCredentials } from '../src/lib/api';
import GradientPressable from '../src/components/GradientPressable';
import MobileLoadingScreen from '../src/components/MobileLoadingScreen';

const bg = require('../assets/onboarding-bg.png');

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await registerWithCredentials({ username, email, password });
      setSuccess('Đăng ký thành công. Vui lòng đăng nhập.');
      setTimeout(() => {
        router.replace('/login');
      }, 700);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
        (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : 'Đăng ký thất bại');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitting) {
    return <MobileLoadingScreen />;
  }

  return (
    <ImageBackground source={bg} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>FloodSight</Text>
            <Text style={styles.brandSub}>Tạo tài khoản mới</Text>
          </View>

          <View style={styles.container}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              placeholder="nguyenvana"
              placeholderTextColor="rgba(255,255,255,0.68)"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor="rgba(255,255,255,0.68)"
            />

            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.68)"
            />

            <Text style={styles.label}>Xác nhận mật khẩu</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.68)"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            <GradientPressable
              style={styles.button}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>Đăng ký</Text>
            </GradientPressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Đã có tài khoản?</Text>
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={styles.switchLink}> Đăng nhập</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%' },
  bgImage: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 21, 58, 0.55)'
  },
  safe: { flex: 1 },
  flex: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 20
  },
  brand: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800'
  },
  brandSub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15
  },
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    padding: 18,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff'
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: '#ffffff'
  },
  error: {
    color: '#fecaca',
    marginTop: 8
  },
  success: {
    color: '#bbf7d0',
    marginTop: 8
  },
  button: {
    marginTop: 20,
    minHeight: 52,
    width: '100%'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  switchRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  switchText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14
  },
  switchLink: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  }
});
