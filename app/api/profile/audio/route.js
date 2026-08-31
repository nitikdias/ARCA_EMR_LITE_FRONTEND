import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const backendUrl = `${API_BASE_URL}/user/audio-samples?user_id=${userId}`;
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: "Failed to fetch audio samples" },
      { status: res.status || 500 }
    );
  } catch (err) {
    console.error("❌ Error in /api/profile/audio GET:", err);
    return NextResponse.json(
      { error: "Internal error fetching audio samples", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const backendUrl = `${API_BASE_URL}/user/audio-samples`;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
      },
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("❌ Error in /api/profile/audio POST:", err);
    return NextResponse.json(
      { error: "Internal error saving audio sample", details: err.message },
      { status: 500 }
    );
  }
}
