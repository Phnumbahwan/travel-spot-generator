"use client";

import { useEffect, useState } from "react";
import { getStoredApiKey } from "@/components/api-key";

interface HeaderProps {
  onKeyClick: () => void;
}

export function Header({ onKeyClick }: HeaderProps) {
  const [hasKey, setHasKey] = useState(false);

  // Re-check whenever the component mounts or the window gains focus
  useEffect(() => {
    const check = () => setHasKey(!!getStoredApiKey());
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  return (
    <header className="bg-warm-white border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none">🌍</span>
            <div className="leading-none">
              <span
                className="font-bold text-warm-text text-xl tracking-tight"
                style={{ fontFamily: "var(--font-lora)" }}
              >
                Latagaw
              </span>
              <span
                className="font-bold text-terracotta text-xl tracking-tight"
                style={{ fontFamily: "var(--font-lora)" }}
              >
                .
              </span>
            </div>
          </div>

          {/* API key button */}
          <button
            onClick={() => {
              onKeyClick();
              // Optimistically re-check after modal closes
              setTimeout(() => setHasKey(!!getStoredApiKey()), 300);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
              hasKey
                ? "border-sage text-sage hover:bg-sage/10"
                : "border-terracotta text-terracotta hover:bg-terracotta/10 animate-pulse"
            }`}
          >
            <span>🔑</span>
            <span>{hasKey ? "Key set" : "Set API Key"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
