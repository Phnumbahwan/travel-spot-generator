"use client";

import { useState } from "react";
import type { TouristSpot } from "@/types/spot";
import { StarRating } from "./StarRating";

type CategoryMeta = {
  emoji: string;
  badge: string;
  gradientFrom: string;
  gradientTo: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  Nature: {
    emoji: "🌿",
    badge: "bg-green-100 text-green-800",
    gradientFrom: "#2d5a27",
    gradientTo: "#6B8F5E",
  },
  Cultural: {
    emoji: "🎨",
    badge: "bg-purple-100 text-purple-800",
    gradientFrom: "#3b1f5e",
    gradientTo: "#7c5ba8",
  },
  Historical: {
    emoji: "🏛️",
    badge: "bg-amber-100 text-amber-800",
    gradientFrom: "#5c3d1e",
    gradientTo: "#9E7040",
  },
  Adventure: {
    emoji: "⛰️",
    badge: "bg-orange-100 text-orange-800",
    gradientFrom: "#7c2d12",
    gradientTo: "#C4714A",
  },
  Beach: {
    emoji: "🏖️",
    badge: "bg-sky-100 text-sky-800",
    gradientFrom: "#0c4a6e",
    gradientTo: "#0284c7",
  },
  Religious: {
    emoji: "⛪",
    badge: "bg-yellow-100 text-yellow-800",
    gradientFrom: "#713f12",
    gradientTo: "#ca8a04",
  },
  Entertainment: {
    emoji: "🎡",
    badge: "bg-pink-100 text-pink-800",
    gradientFrom: "#831843",
    gradientTo: "#db2777",
  },
  Scenic: {
    emoji: "🌄",
    badge: "bg-indigo-100 text-indigo-800",
    gradientFrom: "#1e1b4b",
    gradientTo: "#4338ca",
  },
  Museum: {
    emoji: "🏛️",
    badge: "bg-stone-100 text-stone-800",
    gradientFrom: "#292524",
    gradientTo: "#78716c",
  },
};

const DEFAULT_META: CategoryMeta = {
  emoji: "📍",
  badge: "bg-gray-100 text-gray-700",
  gradientFrom: "#374151",
  gradientTo: "#6b7280",
};

function DetailRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm shrink-0 mt-0.5">{icon}</span>
      <span className="text-warm-muted text-xs leading-relaxed">{text}</span>
    </div>
  );
}

interface SpotCardProps {
  spot: TouristSpot;
}

export function SpotCard({ spot }: SpotCardProps) {
  const [showReviews, setShowReviews] = useState(false);
  const [imgError, setImgError] = useState(false);

  const meta = CATEGORY_META[spot.category] ?? DEFAULT_META;
  // Prefer the real Wikipedia photo; fall back to a seeded placeholder
  const imageUrl =
    spot.imageUrl ||
    `https://picsum.photos/seed/${encodeURIComponent(spot.name)}/800/500`;

  return (
    <article className="bg-warm-white rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
      {/* Image */}
      <div className="relative h-52 overflow-hidden shrink-0">
        {!imgError ? (
          // Plain <img> so requests go through our proxy without Next.js optimizer interference
          <img
            src={imageUrl}
            alt={spot.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl"
            style={{
              background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})`,
            }}
          >
            {meta.emoji}
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${meta.badge}`}
          >
            {meta.emoji} {spot.category}
          </span>
        </div>

        {/* Rating chip */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1 flex items-center gap-1 shadow-sm">
          <span className="text-amber-400 text-xs">★</span>
          <span className="text-warm-text text-xs font-bold">
            {spot.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        {/* Name */}
        <h3
          className="font-bold text-warm-text text-xl leading-tight mb-1"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          {spot.name}
        </h3>

        {/* Star row */}
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={spot.rating} />
          <span className="text-warm-muted text-xs">
            ({spot.reviewCount.toLocaleString()} reviews)
          </span>
        </div>

        {/* Short description */}
        <p className="text-warm-muted text-sm leading-relaxed mb-4 line-clamp-2">
          {spot.shortDescription}
        </p>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <DetailRow icon="📍" text={spot.address} />
          <DetailRow icon="🕐" text={spot.openingHours} />
          <DetailRow icon="💰" text={spot.entranceFee} />
          <DetailRow icon="🚶" text={spot.distance} />
          <DetailRow icon="☀️" text={spot.bestTimeToVisit} />
        </div>

        {/* Tags */}
        {spot.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {spot.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-cream rounded-full text-warm-muted text-xs border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Highlights */}
        {spot.highlights.length > 0 && (
          <div className="mb-4">
            <p className="text-warm-text text-xs font-semibold uppercase tracking-widest mb-2">
              Highlights
            </p>
            <ul className="space-y-1">
              {spot.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-xs text-warm-muted">
                  <span className="text-sage shrink-0 mt-0.5">✦</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full description */}
        <div className="mb-4 p-4 bg-cream rounded-2xl border border-border">
          <p className="text-warm-muted text-xs leading-relaxed">{spot.description}</p>
        </div>

        {/* Reviews toggle */}
        {spot.reviews && spot.reviews.length > 0 && (
          <div className="mt-auto pt-2 border-t border-border">
            <button
              onClick={() => setShowReviews((v) => !v)}
              className="w-full text-xs text-terracotta font-medium hover:text-terracotta-dark transition-colors py-2 flex items-center justify-center gap-1"
            >
              {showReviews
                ? "▲ Hide Reviews"
                : `▼ Read Reviews (${spot.reviews.length})`}
            </button>

            {showReviews && (
              <div className="mt-3 space-y-3">
                {spot.reviews.map((review, i) => (
                  <div key={i} className="p-3 bg-cream rounded-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-warm-text text-xs font-semibold">
                        {review.author}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-warm-muted text-xs">{review.date}</span>
                      </div>
                    </div>
                    <p className="text-warm-muted text-xs leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
