"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  FormEvent,
  KeyboardEvent,
} from "react";

// ── Types ───────────────────────────────────────────────────────────────────
interface NominatimResult {
  place_id: number;
  display_name: string;
  type: string;
  class: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Returns a short "Name, City, Country" label from a Nominatim result */
function shortLabel(r: NominatimResult): string {
  const parts = r.display_name.split(",");
  const name = parts[0].trim();
  const city =
    r.address?.city ??
    r.address?.town ??
    r.address?.village ??
    r.address?.county ??
    r.address?.state ??
    "";
  const country = r.address?.country ?? "";
  return [name, city, country].filter(Boolean).join(", ");
}

/** Pick a place-type icon from Nominatim's class/type fields */
function placeIcon(r: NominatimResult): string {
  const cls = r.class;
  const type = r.type;
  if (type === "country") return "🌍";
  if (type === "city" || type === "town") return "🏙️";
  if (type === "village" || type === "hamlet") return "🏘️";
  if (cls === "tourism") return "✨";
  if (cls === "natural") return "🌿";
  if (cls === "water" || type === "bay" || type === "beach") return "🏖️";
  if (cls === "historic" || type === "ruins" || type === "fort") return "🏛️";
  if (cls === "amenity" && (type === "place_of_worship" || type === "cathedral"))
    return "⛪";
  return "📍";
}

const QUICK_SUGGESTIONS = [
  "Cebu, Philippines",
  "Paris, France",
  "Kyoto, Japan",
  "Bali, Indonesia",
];

// ── Component ────────────────────────────────────────────────────────────────
interface SearchBarProps {
  onSearch: (address: string) => void;
  loading: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [input, setInput] = useState("");
  const [hints, setHints] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch from Nominatim (debounced 350 ms) ───────────────────────────────
  const fetchHints = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setHints([]);
      setOpen(false);
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&limit=6&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      setHints(data);
      setOpen(data.length > 0);
      setActiveIdx(-1);
    } catch {
      setHints([]);
      setOpen(false);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setHints([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchHints(input), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, fetchHints]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const selectHint = (r: NominatimResult) => {
    const label = shortLabel(r);
    setInput(label);          // show the short label in the input field
    setOpen(false);
    setHints([]);
    setActiveIdx(-1);
    onSearch(r.display_name); // send the full Nominatim display_name to the API
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (activeIdx >= 0 && hints[activeIdx]) {
      selectHint(hints[activeIdx]);
    } else {
      setOpen(false);
      onSearch(input.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || hints.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, hints.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto" ref={containerRef}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        {/* Input wrapper */}
        <div className="relative flex-1">
          {/* Pin icon */}
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted pointer-events-none select-none z-10">
            📍
          </span>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => hints.length > 0 && setOpen(true)}
            placeholder="Enter city, region, or address…"
            disabled={loading}
            autoComplete="off"
            className="w-full pl-11 pr-10 py-4 rounded-2xl border-2 border-border bg-warm-white text-warm-text placeholder:text-warm-muted focus:outline-none focus:border-terracotta transition-colors duration-200 text-base shadow-sm disabled:opacity-60"
          />

          {/* Spinner / clear */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {fetching && (
              <span className="w-4 h-4 border-2 border-cream-dark border-t-terracotta rounded-full animate-spin block" />
            )}
            {input && !fetching && (
              <button
                type="button"
                onClick={() => {
                  setInput("");
                  setOpen(false);
                  setHints([]);
                  inputRef.current?.focus();
                }}
                className="text-warm-muted hover:text-warm-text transition-colors text-lg leading-none"
                aria-label="Clear"
              >
                ×
              </button>
            )}
          </div>

          {/* ── Dropdown ─────────────────────────────────────────────── */}
          {open && hints.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-50 left-0 right-0 top-[calc(100%+6px)] bg-warm-white border border-border rounded-2xl shadow-xl overflow-hidden"
            >
              {hints.map((r, i) => {
                const label = shortLabel(r);
                const sublabel = r.display_name;
                const icon = placeIcon(r);
                const active = i === activeIdx;

                return (
                  <li
                    key={r.place_id}
                    role="option"
                    aria-selected={active}
                    onMouseDown={() => selectHint(r)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-100 ${
                      active ? "bg-cream" : "hover:bg-cream"
                    } ${i !== 0 ? "border-t border-border" : ""}`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-warm-text text-sm font-medium truncate">
                        {label}
                      </p>
                      <p className="text-warm-muted text-xs truncate mt-0.5">
                        {sublabel}
                      </p>
                    </div>
                  </li>
                );
              })}

              {/* Footer */}
              <li className="px-4 py-2 bg-cream border-t border-border flex items-center justify-end gap-1">
                <span className="text-warm-muted text-xs opacity-60">
                  Powered by
                </span>
                <a
                  href="https://nominatim.openstreetmap.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-warm-muted opacity-60 hover:opacity-100 hover:text-terracotta transition-opacity"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  OpenStreetMap Nominatim
                </a>
              </li>
            </ul>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-8 py-4 bg-terracotta text-white rounded-2xl font-medium hover:bg-terracotta-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
              Discovering…
            </span>
          ) : (
            "Find Spots"
          )}
        </button>
      </form>

      {/* Quick suggestions — only when input is empty */}
      {!input && !loading && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <span className="text-warm-muted text-xs">Try:</span>
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setInput(s);
                onSearch(s);
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-warm-muted bg-warm-white hover:border-terracotta hover:text-terracotta transition-colors duration-150"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
