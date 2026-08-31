import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const backendUrl = `${API_BASE_URL}/user/audio-samples/${id}/download`;

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "X-API-KEY": API_KEY,
      },
    });

    if (res.ok) {
      const audioBuffer = await res.arrayBuffer();
      const disposition = res.headers.get("content-disposition") || `attachment; filename="sample_${id}.wav"`;
      return new Response(audioBuffer, {
        headers: {
          "Content-Type": "audio/wav",
          "Content-Disposition": disposition,
          "Content-Length": audioBuffer.byteLength.toString(),
        },
      });
    }

    return NextResponse.json(
      { error: "Audio sample not found" },
      { status: res.status || 404 }
    );
  } catch (err) {
    console.error("❌ Error downloading audio sample:", err);
    return NextResponse.json(
      { error: "Internal error downloading audio", details: err.message },
      { status: 500 }
    );
  }
}
