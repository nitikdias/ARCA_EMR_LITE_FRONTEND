import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || searchParams.get("userId");

    let backendUrl = `${API_BASE_URL}/templates`;
    if (userId) {
      backendUrl = `${API_BASE_URL}/user/templates?user_id=${userId}`;
    }

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
      { error: "Failed to fetch templates" },
      { status: res.status || 500 }
    );
  } catch (err) {
    console.error("❌ Error in /api/profile/templates GET:", err);
    return NextResponse.json(
      { error: "Internal error fetching templates", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  return handleTemplateSave(req);
}

export async function PUT(req) {
  return handleTemplateSave(req);
}

async function handleTemplateSave(req) {
  try {
    const body = await req.json();
    const backendUrl = `${API_BASE_URL}/user/templates`;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("❌ Error in /api/profile/templates save:", err);
    return NextResponse.json(
      { error: "Internal error assigning templates", details: err.message },
      { status: 500 }
    );
  }
}
