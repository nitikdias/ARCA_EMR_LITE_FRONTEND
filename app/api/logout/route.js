import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || '';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (sessionId && API_BASE_URL) {
      const rawApiBase = API_BASE_URL.replace(/\/+$/, '');
      await fetch(`${rawApiBase}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
        body: JSON.stringify({ session_id: sessionId }),
      }).catch(err => console.error('Backend logout error:', err));
    }

    const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
    response.cookies.delete('session_id');

    return response;
  } catch (error) {
    console.error('💥 Logout error:', error);
    const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
    response.cookies.delete('session_id');
    return response;
  }
}

