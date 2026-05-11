import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import { isGuestBrowseMode } from '../../utils/guestSession';
import GuestAuthWall from './GuestAuthWall';

export function ProtectedRoute({ children }) {
  if (isAuthenticated()) return children;
  if (isGuestBrowseMode()) return <GuestAuthWall />;
  return <Navigate to="/login" replace />;
}
