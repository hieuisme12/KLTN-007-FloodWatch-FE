import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import MobileLoadingScreen from '../src/components/MobileLoadingScreen';

export default function EntryScreen() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <MobileLoadingScreen />;
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/onboarding'} />;
}
