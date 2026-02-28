import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { logCompletion, isDailyBudgetExceeded } from "@/lib/logger";
import type { TouristSpot } from "@/types/spot";

// OpenAI client is created per-request using the key from the request header

// ── Wikipedia image fetcher ───────────────────────────────────────────────────

async function fetchWikipediaImage(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: {
          "User-Agent": "LatagawTravelApp/1.0 (educational project)",
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Upscale the thumbnail URL from its default size to 800px wide
    const thumb: string | undefined = data.thumbnail?.source;
    if (thumb) return thumb.replace(/\/\d+px-/, "/800px-");
    return null;
  } catch {
    return null;
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

type SpotFromAI = TouristSpot & { wikipediaTitle?: string };

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

    // ── Cost guardrail: block if daily budget is already spent ────────────
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
      },
      "wikipediaTitle": "Exact_Wikipedia_page_title_with_underscores (e.g. Maria_Cristina_Falls)"
    }
  ]
}

Use only real places that actually exist near "${address}". Make descriptions informative and authentic. Vary the categories across the 8 spots. Ensure coordinates are accurate. For wikipediaTitle, provide the exact Wikipedia article title (use underscores) so we can fetch the real photo.`,
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

    // ── Fetch Wikipedia images in parallel ────────────────────────────────
    const spots: SpotFromAI[] = data.spots ?? [];
    data.spots = await Promise.all(
      spots.map(async (spot) => {
        const { wikipediaTitle, ...spotData } = spot;
        const wikiUrl = wikipediaTitle
          ? await fetchWikipediaImage(wikipediaTitle)
          : null;
        // Route through our proxy so the browser never hits Wikimedia directly
        const imageUrl = wikiUrl
          ? `/api/image-proxy?url=${encodeURIComponent(wikiUrl)}`
          : null;
        return { ...spotData, imageUrl };
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
