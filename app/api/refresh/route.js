import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // ✅ Await cookies() - required in Next.js 15
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id');

    if (!sessionId) {
      console.error('❌ No session_id cookie found');
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    console.log('🔁 Forwarding refresh request to Flask backend');

    // ✅ Forward request to Flask with the session_id cookie
    const response = await fetch('http://localhost:8000/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'n1i2t3i4k5d6i7a8s',
        'Cookie': `session_id=${sessionId.value}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Flask refresh failed:', errorText);
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const expiresIn = data.expires_in || 60;
    
    console.log('✅ Token refresh successful, expires in:', expiresIn, 'seconds');
    
    // ✅ Create response
    const nextResponse = NextResponse.json(data);
    
    // ✅ Update the session_id cookie with new expiration
    nextResponse.cookies.set('session_id', sessionId.value, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn
    });
    
    console.log('✅ Updated session_id cookie with new expiration:', expiresIn + 's');
    
    return nextResponse;
    
  } catch (error) {
    console.error('💥 Refresh error:', error);
    return NextResponse.json(
      { error: 'Refresh failed' },
      { status: 500 }
    );
  }
}
