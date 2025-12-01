import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Forward to proxy/logout which handles backend call and cookie clearing
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/api/proxy/logout`, {
      method: 'POST',
      headers: request.headers,
    });

    const data = await res.json();
    
    // Create response with same status
    const response = NextResponse.json(data, { status: res.status });
    
    // Copy cookie deletion from proxy response
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }
    
    return response;

  } catch (error) {
    console.error('💥 Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
