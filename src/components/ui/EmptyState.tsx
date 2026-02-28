export function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4 select-none">🔍</div>
      <h3
        className="font-bold text-warm-text text-xl mb-2"
        style={{ fontFamily: "var(--font-lora)" }}
      >
        No spots found
      </h3>
      <p className="text-warm-muted text-sm max-w-xs mx-auto">
        We couldn&apos;t find tourist spots for that location. Try being more specific
        or search a nearby city.
      </p>
    </div>
  );
}
