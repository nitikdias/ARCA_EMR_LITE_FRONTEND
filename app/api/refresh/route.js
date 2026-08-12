import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export async function POST(request) {
  try {
    // ✅ Await cookies() - required in Next.js 15
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id');
    
    // Log all cookies to debug missing session
    const cookieNames = cookieStore.getAll().map(c => c.name).join(", ");
    console.log(`🌐 [Refresh API] Cookies found: [${cookieNames || "NONE"}]`);

    if (!sessionId) {
      console.error('❌ [Refresh API] No session_id cookie found');
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    console.log('🔁 [Refresh API] Forwarding to backend:', `${API_BASE_URL}/refresh`);
    console.log('   Session ID:', sessionId.value.substring(0, 8) + '...');
    console.log('   API_KEY:', API_KEY ? `Set (${API_KEY.length} chars)` : '❌ MISSING');

    if (!API_KEY) {
      console.error('❌ API_KEY not set in environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // ✅ Forward request to Flask with session_id in both Cookie and X-Session-ID headers
    // Backend checks X-Session-ID as fallback if Cookie header is stripped by proxy
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
        'X-Session-ID': sessionId.value, // ✅ Fallback for proxy environments
        'Cookie': `session_id=${sessionId.value}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Flask refresh failed:', errorText);

      // ✅ If session is invalid/expired (401), delete the stale cookie
      if (response.status === 401) {
        console.log('🗑️ Deleting stale session_id cookie due to 401 from backend');
        const nextResponse = NextResponse.json(
          { error: errorText },
          { status: response.status }
        );
        nextResponse.cookies.delete('session_id');
        return nextResponse;
      }

      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const expiresIn = data.expires_in || 60;

    console.log('✅ Token refresh successful, expires in:', expiresIn, 'seconds');

    // ✅ Need to explicitly set the cookie since we're proxying
    // The backend's Set-Cookie header won't work across different origins
    const nextResponse = NextResponse.json(data);

    nextResponse.cookies.set('session_id', sessionId.value, {
      httpOnly: true,
      secure: false, // Allow sessions over HTTP in private networks
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn, // ✅ Extend cookie lifetime with each refresh
    });

    console.log(`✅ Extended session_id cookie lifetime by ${expiresIn}s`);

    return nextResponse;

  } catch (error) {
    console.error('💥 Refresh error:', error);
    return NextResponse.json(
      { error: 'Refresh failed' },
      { status: 500 }
    );
  }
}
