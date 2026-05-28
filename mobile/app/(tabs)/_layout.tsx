import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import FloatingCurvedTabBar from '../../src/components/FloatingCurvedTabBar';
import TabNavSafeBottomFill from '../../src/components/TabNavSafeBottomFill';
import { colors } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TabNavSafeBottomFill />
      <Tabs
      tabBar={(props) => <FloatingCurvedTabBar {...props} />}
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: undefined,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'visible'
        },
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="map" options={{ title: 'Tìm đường' }} />
      <Tabs.Screen name="reports" options={{ title: 'Báo cáo' }} />
      <Tabs.Screen name="profile" options={{ title: 'Tài khoản' }} />
    </Tabs>
    </View>
  );
}
