import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // ✅ Await cookies()
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id');

    if (!sessionId) {
      console.error('❌ No session_id cookie found');
      
      // Clear anyway
      const nextResponse = NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
      nextResponse.cookies.delete('session_id');
      return nextResponse;
    }

    console.log('🔁 Forwarding logout request to Flask backend');

    const response = await fetch('http://localhost:8000/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'n1i2t3i4k5d6i7a8s',
        'Cookie': `session_id=${sessionId.value}`,  // ✅ Send cookie
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Flask logout failed:', errorText);
      
      // Even on error, clear the session_id cookie
      const nextResponse = NextResponse.json(
        { error: 'Logout failed' },
        { status: response.status }
      );
      nextResponse.cookies.delete('session_id');
      return nextResponse;
    }

    const data = await response.json();
    console.log('✅ Logout successful on backend');

    // ✅ Create response and delete session_id cookie
    const nextResponse = NextResponse.json(data);
    nextResponse.cookies.delete('session_id');
    console.log('✅ Cleared session_id cookie');

    return nextResponse;

  } catch (error) {
    console.error('💥 Logout error:', error);
    
    const nextResponse = NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
    nextResponse.cookies.delete('session_id');
    
    return nextResponse;
  }
}
