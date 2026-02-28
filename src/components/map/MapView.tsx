"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { TouristSpot } from "@/types/spot";

// Dynamically imported — Leaflet touches `window` and can't run on the server
const LeafletMap = dynamic(
  () => import("./LeafletMap").then((m) => ({ default: m.LeafletMap })),
  {
    ssr: false,
    loading: () => (
      <MapPlaceholder label="Loading map…" spinner />
    ),
  }
);

function MapPlaceholder({
  label,
  spinner = false,
}: {
  label: string;
  spinner?: boolean;
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-cream-dark gap-3">
      {spinner && (
        <div className="w-8 h-8 border-2 border-cream border-t-terracotta rounded-full animate-spin" />
      )}
      <p className="text-warm-muted text-sm">{label}</p>
    </div>
  );
}

interface MapViewProps {
  address: string;
  locationName: string;
  spots?: TouristSpot[];
}

export function MapView({ address, locationName, spots = [] }: MapViewProps) {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<"geocoding" | "ready" | "error">(
    "geocoding"
  );

  // Geocode via Nominatim — free, no API key required
  useEffect(() => {
    if (!address) return;
    setStatus("geocoding");
    setCenter(null);

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.length > 0) {
          setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [address]);

  // Fallback: use the first spot's coordinates when geocoding fails
  useEffect(() => {
    if (status === "error" && spots.length > 0) {
      const spot = spots.find((s) => s.coordinates);
      if (spot?.coordinates) {
        setCenter([spot.coordinates.lat, spot.coordinates.lng]);
        setStatus("ready");
      }
    }
  }, [spots, status]);

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg select-none">🗺️</span>
        <h3
          className="font-semibold text-warm-text text-lg"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          Exploring:{" "}
          <span className="text-terracotta">{locationName || address}</span>
        </h3>
        {spots.length > 0 && (
          <span className="text-xs text-warm-muted bg-cream px-2.5 py-0.5 rounded-full border border-border">
            {spots.filter((s) => s.coordinates).length} spots pinned
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="rounded-3xl overflow-hidden border border-border shadow-md h-64 md:h-96">
        {status === "geocoding" && (
          <MapPlaceholder label="Finding location…" spinner />
        )}
        {status === "error" && (
          <MapPlaceholder label="Could not locate this address on the map." />
        )}
        {status === "ready" && center && (
          <LeafletMap
            center={center}
            locationName={locationName || address}
            spots={spots}
          />
        )}
      </div>

      {/* Attribution */}
      <p className="text-warm-muted text-xs mt-2 text-right">
        Map data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-terracotta transition-colors"
        >
          OpenStreetMap
        </a>{" "}
        contributors
      </p>
    </section>
  );
}
