import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primaryDark },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="index" options={{ title: 'FloodSight' }} />
        <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="profile" options={{ title: 'Tài khoản' }} />
      </Stack>
    </AuthProvider>
  );
}
