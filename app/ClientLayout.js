"use client";

export default function ClientLayout({ children }) {
  // Token refresh is now handled by TokenRefreshManager in layout.js
  return <>{children}</>;
}
