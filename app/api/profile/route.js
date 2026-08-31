import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId");
    let email = searchParams.get("email");

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const headers = {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    };

    if (sessionId) {
      headers["Cookie"] = `session_id=${sessionId}`;
    }

    // Try fetching profile from backend /user/profile
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append("user_id", userId);
    if (email) queryParams.append("email", email);

    const backendUrl = `${API_BASE_URL}/user/profile${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    
    console.log(`🔄 Fetching user profile from: ${backendUrl}`);

    const res = await fetch(backendUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fallback: If session exists, try /verify-session and query with user_id
    if (sessionId && (!userId && !email)) {
      const verifyRes = await fetch(`${API_BASE_URL}/verify-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData.valid && verifyData.user_id) {
          const secondAttempt = await fetch(`${API_BASE_URL}/user/profile?user_id=${verifyData.user_id}`, {
            method: "GET",
            headers,
          });
          if (secondAttempt.ok) {
            const profileData = await secondAttempt.json();
            return NextResponse.json(profileData);
          }
          // Return verify session info as minimal user data if full profile not found
          return NextResponse.json({
            status: "success",
            user: {
              id: verifyData.user_id,
              email: verifyData.email,
              name: verifyData.email?.split("@")[0] || "User",
              status: "active",
            },
          });
        }
      }
    }

    return NextResponse.json(
      { error: "Could not fetch user demographics" },
      { status: res.status || 400 }
    );
  } catch (err) {
    console.error("❌ Error in /api/profile GET:", err);
    return NextResponse.json(
      { error: "Internal error fetching profile", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("user_id") || searchParams.get("userId") || body.user_id || body.id;
    let email = searchParams.get("email") || body.email;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const headers = {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    };

    if (sessionId) {
      headers["Cookie"] = `session_id=${sessionId}`;
    }

    const queryParams = new URLSearchParams();
    if (userId) queryParams.append("user_id", userId);
    if (email) queryParams.append("email", email);

    const backendUrl = `${API_BASE_URL}/user/profile${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    
    console.log(`🔄 Updating user profile at: ${backendUrl}`);

    const res = await fetch(backendUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("❌ Error in /api/profile PUT:", err);
    return NextResponse.json(
      { error: "Internal error updating profile", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  return PUT(req);
}
