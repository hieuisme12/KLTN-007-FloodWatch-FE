import { useState } from 'react';
import {
  ImageBackground,
  Image,
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
import { useAuth } from '../src/context/AuthContext';
import GradientPressable from '../src/components/GradientPressable';
import { colors } from '../src/theme';
import MobileLoadingScreen from '../src/components/MobileLoadingScreen';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from '../src/lib/config';
import { extractLoginTokenBundle, persistAuthFromLoginResponse } from '../src/lib/api';

const bg = require('../assets/onboarding-bg.png');
const googleLogo = require('../assets/google-logo.png');
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, refreshUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password) {
      setError('Nhập tên đăng nhập/email và mật khẩu.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username, password);
      router.replace('/(tabs)');
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (e instanceof Error ? e.message : 'Đăng nhập thất bại');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setError(null);
    try {
      const redirectUri = Linking.createURL('/login');
      const startUrl = `${API_BASE_URL}/api/v1/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

      if (result.type !== 'success' || !result.url) {
        setSubmitting(false);
        return;
      }

      const parseParams = (url: string) => {
        const qIndex = url.indexOf('?');
        const hIndex = url.indexOf('#');
        const query = qIndex >= 0 ? url.slice(qIndex + 1) : '';
        const hash = hIndex >= 0 ? url.slice(hIndex + 1) : '';
        return new URLSearchParams(`${query}&${hash}`);
      };

      const params = parseParams(result.url);
      const access = params.get('access_token') || params.get('token');
      if (!access) {
        throw new Error('Không nhận được access token từ Google.');
      }

      const payload: Record<string, unknown> = { access_token: access };
      const refresh = params.get('refresh_token');
      const session = params.get('session_token');
      const expiresIn = params.get('expires_in') ?? params.get('expiresIn');
      if (refresh) payload.refresh_token = refresh;
      if (session) payload.session_token = session;
      if (expiresIn) payload.expires_in = expiresIn;
      const userRaw = params.get('user');
      if (userRaw) {
        try {
          payload.user = JSON.parse(decodeURIComponent(userRaw));
        } catch {
          try {
            payload.user = JSON.parse(userRaw);
          } catch {
            // ignore invalid user payload
          }
        }
      }

      await persistAuthFromLoginResponse(
        extractLoginTokenBundle(payload) as Record<string, unknown>
      );
      await refreshUser();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập Google thất bại');
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
            <Text style={styles.brandSub}>Đăng nhập tài khoản</Text>
          </View>

          <View style={styles.container}>
            <Text style={styles.label}>Email hoặc tên đăng nhập</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={username}
              onChangeText={setUsername}
              placeholder="username@email.com"
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <GradientPressable
              style={styles.button}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>Đăng nhập</Text>
            </GradientPressable>

            <View style={styles.socialDividerRow}>
              <View style={styles.socialDividerLine} />
              <Text style={styles.socialDividerText}>Or sign up with</Text>
              <View style={styles.socialDividerLine} />
            </View>

            <Pressable
              style={[styles.googleButton, submitting && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={submitting}
            >
              <Image source={googleLogo} style={styles.googleLogo} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Chưa có tài khoản?</Text>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={styles.switchLink}> Đăng ký</Text>
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
    color: colors.danger,
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
  googleButton: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: '100%'
  },
  googleButtonText: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 16
  },
  googleLogo: {
    width: 20,
    height: 20
  },
  socialDividerRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)'
  },
  socialDividerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500'
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
