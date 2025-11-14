"use client";

import useTokenRefresher from "./hooks/useTokenRefresher";

export default function ClientLayout({ children }) {
  useTokenRefresher(); // runs only on the client
  return <>{children}</>;
}
