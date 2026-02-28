import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST = "upload.wikimedia.org";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Only allow Wikimedia to prevent open-proxy abuse
  try {
    if (new URL(url).hostname !== ALLOWED_HOST) {
      return new NextResponse("Host not allowed", { status: 403 });
    }
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Wikimedia requires a descriptive User-Agent and Referer
        "User-Agent":
          "LatagawTravelApp/1.0 (educational project; contact@example.com)",
        Referer: "https://en.wikipedia.org/",
        Accept: "image/*",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, {
        status: res.status,
      });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        // Cache aggressively — Wikipedia images don't change often
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Image fetch timed out"
      : "Failed to fetch image";
    return new NextResponse(msg, { status: 502 });
  }
}
