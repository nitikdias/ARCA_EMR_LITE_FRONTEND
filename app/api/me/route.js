import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";
const TOKEN_KEY = process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY;

export async function GET(req) {
  try {
    // Get session_id from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    
    if (!sessionId) {
      console.log("⚠️ No session_id cookie found");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Verify session with backend
    const res = await fetch(`${API_BASE_URL}/verify-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!res.ok) {
      console.log("⚠️ Session verification failed");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const data = await res.json();
    
    if (!data.valid) {
      console.log("⚠️ Invalid session");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Return user info from session
    return NextResponse.json({ 
      user: {
        id: data.user_id,
        email: data.email,
      }
    });
    
  } catch (err) {
    console.error("❌ Error in /api/me:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
