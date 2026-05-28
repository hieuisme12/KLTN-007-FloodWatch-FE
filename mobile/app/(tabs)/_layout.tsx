import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import HouseIcon from '../../src/components/HouseIcon';
import MapPinnedIcon from '../../src/components/MapPinnedIcon';
import NotepadTextIcon from '../../src/components/NotepadTextIcon';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border
        },
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <HouseIcon size={size} color={color} strokeWidth={2} />
          )
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Tìm đường',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MapPinnedIcon size={size} color={color} strokeWidth={2} />
          )
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Báo cáo',
          tabBarIcon: ({ color, size }) => (
            <NotepadTextIcon size={size} color={color} strokeWidth={2} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: tabIcon('person-outline')
        }}
      />
    </Tabs>
  );
}
