"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search";
import { MapView } from "@/components/map";
import { SpotGrid } from "@/components/spot-grid";
import { LoadingSpinner, EmptyState } from "@/components/ui";
import { ApiKeyModal, getStoredApiKey } from "@/components/api-key";
import type { TouristSpot, SearchResponse } from "@/types/spot";

type AppState = "idle" | "loading" | "results" | "empty" | "error";

export default function Home() {
  const [address, setAddress] = useState("");
  const [locationName, setLocationName] = useState("");
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [appState, setAppState] = useState<AppState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // API key modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  // Pending search address — set when a search is attempted without a key
  const [pendingAddress, setPendingAddress] = useState("");

  // Load key from sessionStorage on mount
  useEffect(() => {
    setApiKey(getStoredApiKey());
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const runSearch = async (searchAddress: string, key: string) => {
    setAddress(searchAddress);
    setAppState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/generate-spots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-key": key,
        },
        body: JSON.stringify({ address: searchAddress }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Something went wrong.");
      }

      const data: SearchResponse = await res.json();
      const fetchedSpots = data.spots ?? [];

      setSpots(fetchedSpots);
      setLocationName(data.locationName ?? searchAddress);
      setAppState(fetchedSpots.length === 0 ? "empty" : "results");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to fetch spots.");
      setAppState("error");
    }
  };

  const handleSearch = (searchAddress: string) => {
    const key = getStoredApiKey();
    if (!key) {
      // No key yet — show modal then continue with the search
      setPendingAddress(searchAddress);
      setShowKeyModal(true);
      return;
    }
    runSearch(searchAddress, key);
  };

  const handleKeySave = (savedKey: string) => {
    setApiKey(savedKey);
    setShowKeyModal(false);
    if (pendingAddress) {
      const addr = pendingAddress;
      setPendingAddress("");
      runSearch(addr, savedKey);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream">
      <Header onKeyClick={() => setShowKeyModal(true)} />

      {/* API Key Modal */}
      <ApiKeyModal
        open={showKeyModal}
        onSave={handleKeySave}
        onClose={() => setShowKeyModal(false)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* ── Hero ── */}
        <section className="py-16 md:py-20 text-center">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-warm-text mb-4 leading-tight"
            style={{ fontFamily: "var(--font-lora)" }}
          >
            Find Your Next
            <br />
            <span className="text-terracotta">Adventure</span>
          </h1>

          <p className="text-warm-muted text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Enter any city, region, or address and we&apos;ll uncover the most
            remarkable spots waiting to be explored.
          </p>

          <SearchBar
            onSearch={handleSearch}
            loading={appState === "loading"}
          />

          {/* No-key nudge */}
          {!apiKey && (
            <p className="mt-4 text-xs text-warm-muted">
              <button
                onClick={() => setShowKeyModal(true)}
                className="text-terracotta hover:underline font-medium"
              >
                Set your OpenAI API key
              </button>{" "}
              to start discovering spots.
            </p>
          )}
        </section>

        {/* ── Decorative divider ── */}
        {appState !== "idle" && (
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 border-t border-border" />
            <span className="text-warm-muted text-xs tracking-widest uppercase">
              Results
            </span>
            <div className="flex-1 border-t border-border" />
          </div>
        )}

        {/* ── Map ── */}
        {appState !== "idle" && address && (
          <MapView address={address} locationName={locationName} spots={spots} />
        )}

        {/* ── Loading ── */}
        {appState === "loading" && <LoadingSpinner />}

        {/* ── Error ── */}
        {appState === "error" && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl text-sm">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {appState === "results" && (
          <SpotGrid spots={spots} locationName={locationName} />
        )}

        {/* ── Empty ── */}
        {appState === "empty" && <EmptyState />}

        {/* ── Idle hint ── */}
        {appState === "idle" && (
          <div className="text-center pb-8">
            <div className="inline-flex items-center gap-6 text-warm-muted text-sm">
              {["🏛️ History", "🏖️ Beaches", "🌿 Nature", "🎨 Culture"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-warm-white py-8 text-center">
        <p
          className="font-semibold text-warm-text text-lg mb-1"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          Latagaw
        </p>
        <p className="text-warm-muted text-xs">
          AI-powered travel discovery · Always verify info before visiting
        </p>
      </footer>
    </div>
  );
}
