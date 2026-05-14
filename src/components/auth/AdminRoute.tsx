import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasRole } from '@/utils/auth';

export interface AdminRouteProps {
  children: React.ReactNode;
}

/** Chỉ admin hoặc moderator — bảo vệ toàn bộ `/admin/*`. */
export function AdminRoute({ children }: AdminRouteProps) {
  if (!hasRole(['admin', 'moderator'])) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
