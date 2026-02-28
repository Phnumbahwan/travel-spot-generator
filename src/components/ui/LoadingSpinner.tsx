export function LoadingSpinner() {
  return (
    <div className="py-16">
      {/* Spinner + message */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="w-12 h-12 border-4 border-cream-dark border-t-terracotta rounded-full animate-spin" />
        <div className="text-center">
          <p
            className="font-semibold text-warm-text text-lg"
            style={{ fontFamily: "var(--font-lora)" }}
          >
            Discovering spots…
          </p>
          <p className="text-warm-muted text-sm mt-1">
            Our travel guide is exploring the area for you
          </p>
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-warm-white rounded-3xl overflow-hidden border border-border animate-pulse"
          >
            <div className="h-52 bg-cream-dark" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-cream-dark rounded-full w-3/4" />
              <div className="h-3 bg-cream-dark rounded-full w-1/2" />
              <div className="space-y-2 pt-1">
                <div className="h-3 bg-cream-dark rounded-full w-full" />
                <div className="h-3 bg-cream-dark rounded-full w-5/6" />
                <div className="h-3 bg-cream-dark rounded-full w-4/6" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-16 bg-cream-dark rounded-full" />
                <div className="h-6 w-20 bg-cream-dark rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
