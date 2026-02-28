import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { logCompletion, isDailyBudgetExceeded } from "@/lib/logger";
import type { TouristSpot } from "@/types/spot";

// OpenAI client is created per-request using the key from the request header

// ── Wikipedia image fetcher ───────────────────────────────────────────────────

const WIKI_HEADERS = {
  "User-Agent": "LatagawTravelApp/1.0 (educational project)",
  Accept: "application/json",
};

/**
 * Returns a raw upload.wikimedia.org URL for use in a plain <img> tag.
 * Browser <img> loads cross-origin images without CORS restriction — no proxy needed.
 *
 * Step 1 – direct REST summary by spot name
 * Step 2 – Wikipedia search API fallback if step 1 has no thumbnail
 */
async function fetchWikipediaImage(spotName: string): Promise<string | null> {
  const upscale = (url: string) => url.replace(/\/\d+px-/, "/640px-");

  // ── Step 1: direct lookup ────────────────────────────────────────────────
  try {
    const slug = spotName.trim().replace(/ /g, "_");
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      { headers: WIKI_HEADERS }
    );
    if (res.ok) {
      const data = await res.json();
      const thumb: string | undefined = data.thumbnail?.source;
      if (thumb) {
        console.log(`[wiki] ✅ direct "${spotName}"`);
        return upscale(thumb);
      }
    }
  } catch (e) {
    console.warn(`[wiki] direct error "${spotName}":`, e);
  }

  // ── Step 2: search-API fallback ──────────────────────────────────────────
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        spotName
      )}&format=json&srlimit=1&origin=*`,
      { headers: WIKI_HEADERS }
    );
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const pageTitle: string | undefined =
      searchData?.query?.search?.[0]?.title;
    if (!pageTitle) {
      console.warn(`[wiki] no results "${spotName}"`);
      return null;
    }

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        pageTitle.replace(/ /g, "_")
      )}`,
      { headers: WIKI_HEADERS }
    );
    if (!summaryRes.ok) return null;

    const summaryData = await summaryRes.json();
    const thumb: string | undefined = summaryData.thumbnail?.source;
    if (thumb) {
      console.log(`[wiki] ✅ search fallback "${pageTitle}" for "${spotName}"`);
      return upscale(thumb);
    }

    console.warn(`[wiki] no thumbnail on "${pageTitle}" for "${spotName}"`);
    return null;
  } catch (e) {
    console.warn(`[wiki] search error "${spotName}":`, e);
    return null;
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    // Prefer the key sent by the client; fall back to server env for local dev
    const apiKey =
      request.headers.get("x-openai-key") ?? process.env.OPENAI_API_KEY ?? "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key provided. Click 'Set API Key' and enter your OpenAI key." },
        { status: 401 }
      );
    }

    const openai = new OpenAI({ apiKey });

    if (!address?.trim()) {
      return NextResponse.json(
        { error: "Please provide an address or location." },
        { status: 400 }
      );
    }

    // ── Cost guardrail ────────────────────────────────────────────────────
    if (isDailyBudgetExceeded()) {
      console.warn("[guardrail] Daily OpenAI budget exceeded — request blocked.");
      return NextResponse.json(
        { error: "Daily request limit reached. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert travel guide with deep knowledge of tourist destinations worldwide. Always respond with valid JSON only. Provide accurate, real information about actual places.",
        },
        {
          role: "user",
          content: `Generate a list of 8 real, well-known tourist spots in or near "${address}".

Return a JSON object with this exact structure:
{
  "locationName": "Formatted location name (e.g. Cebu City, Philippines)",
  "spots": [
    {
      "id": "spot-1",
      "name": "Real tourist spot name",
      "description": "Detailed 3-4 sentence description covering history, significance, and visitor experience",
      "shortDescription": "One compelling sentence that captures the essence of this place",
      "address": "Specific street address or area (e.g. Fort San Pedro, A. Pigafetta St, Cebu City)",
      "distance": "X.X km from city center",
      "rating": 4.7,
      "reviewCount": 2847,
      "entranceFee": "Free" or "PHP 75 / person" or "USD 12 / person",
      "category": "Nature|Cultural|Historical|Adventure|Beach|Religious|Entertainment|Scenic|Museum",
      "openingHours": "8:00 AM – 5:00 PM, Daily",
      "bestTimeToVisit": "Specific time recommendation with brief reason",
      "highlights": ["Key feature or attraction 1", "Key feature or attraction 2", "Key feature or attraction 3"],
      "tags": ["scenic", "family-friendly", "photography", "heritage"],
      "reviews": [
        {
          "author": "Traveler Name",
          "rating": 5,
          "comment": "Authentic 1-2 sentence review from a visitor's perspective",
          "date": "2024-11-15"
        },
        {
          "author": "Another Traveler",
          "rating": 4,
          "comment": "Another authentic review",
          "date": "2024-09-22"
        },
        {
          "author": "Third Reviewer",
          "rating": 5,
          "comment": "Third authentic review",
          "date": "2024-12-03"
        }
      ],
      "coordinates": {
        "lat": 10.2931,
        "lng": 123.9015
      }
    }
  ]
}

Use only real places that actually exist near "${address}". Make descriptions informative and authentic. Vary the categories across the 8 spots. Ensure coordinates are accurate.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 4096,
    });

    const durationMs = Date.now() - startTime;
    logCompletion({ address, completion, durationMs });

    const raw = completion.choices[0].message.content ?? "{}";
    const data = JSON.parse(raw);

    // ── Attach Wikipedia images (raw Wikimedia URL — no proxy needed) ─────
    const spots: TouristSpot[] = data.spots ?? [];
    console.log(`[wiki] fetching images for ${spots.length} spots…`);

    data.spots = await Promise.all(
      spots.map(async (spot) => {
        const imageUrl = await fetchWikipediaImage(spot.name);
        console.log(`[wiki] ${spot.name} → ${imageUrl ? "image ✅" : "no image ❌"}`);
        return { ...spot, imageUrl: imageUrl ?? null };
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating spots:", error);
    return NextResponse.json(
      { error: "Failed to generate travel spots. Please try again." },
      { status: 500 }
    );
  }
}
