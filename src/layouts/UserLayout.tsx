import React from 'react';

export interface UserLayoutProps {
  children: React.ReactNode;
}

/** Layout phía người dùng cuối: thoáng, tập trung nội dung ( bọc ngoài `Layout` hiện có ). */
export default function UserLayout({ children }: UserLayoutProps) {
  return <div className="user-surface min-h-0 text-slate-900 antialiased">{children}</div>;
}
