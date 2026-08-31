import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backendUrl = `${API_BASE_URL}/user/lookups`;
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
      { error: "Failed to fetch lookups from backend" },
      { status: res.status || 500 }
    );
  } catch (err) {
    console.error("❌ Error in /api/profile/lookups:", err);
    return NextResponse.json(
      { error: "Internal error fetching lookups", details: err.message },
      { status: 500 }
    );
  }
}
