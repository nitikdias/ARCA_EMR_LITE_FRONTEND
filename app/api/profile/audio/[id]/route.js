import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const backendUrl = `${API_BASE_URL}/user/audio-samples/${id}/play`;

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "X-API-KEY": API_KEY,
      },
    });

    if (res.ok) {
      const audioBuffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "audio/wav";
      return new Response(audioBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": audioBuffer.byteLength.toString(),
          "Accept-Ranges": "bytes",
        },
      });
    }

    return NextResponse.json(
      { error: "Audio sample not found" },
      { status: res.status || 404 }
    );
  } catch (err) {
    console.error("❌ Error streaming audio sample:", err);
    return NextResponse.json(
      { error: "Internal error streaming audio", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    let backendUrl = `${API_BASE_URL}/user/audio-samples/${id}`;
    if (userId) backendUrl += `?user_id=${userId}`;

    const res = await fetch(backendUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("❌ Error deleting audio sample:", err);
    return NextResponse.json(
      { error: "Internal error deleting audio sample", details: err.message },
      { status: 500 }
    );
  }
}
