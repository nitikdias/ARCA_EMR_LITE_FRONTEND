"use client";

import { useEffect } from "react";

export default function useTokenRefresher() {
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
    const refreshAccessToken = async () => {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return;

      try {
        const res = await fetch(`${API_BASE_URL}/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) throw new Error("Failed to refresh token");

        const data = await res.json();
        console.log("🔄 Token refreshed:", data);

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        document.cookie = `access_token=${data.access_token}; path=/; max-age=${data.expires_in}`;
      } catch (err) {
        console.error("❌ Token refresh failed:", err);
        localStorage.clear();
        document.cookie = "access_token=; path=/; max-age=0";
        window.location.href = "/login";
      }
    };

    // ⏱️ Poll every 5 seconds
    const interval = setInterval(refreshAccessToken, 50 * 1000);

    return () => clearInterval(interval);
  }, []);
}
