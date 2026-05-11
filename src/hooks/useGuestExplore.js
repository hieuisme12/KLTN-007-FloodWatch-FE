import { useContext } from 'react';
import { GuestExploreContext } from '../context/guestExploreContext';

export function useGuestExplore() {
  const ctx = useContext(GuestExploreContext);
  if (!ctx) {
    throw new Error('useGuestExplore must be used within GuestExploreProvider');
  }
  return ctx;
}
