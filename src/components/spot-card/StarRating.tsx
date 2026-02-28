interface StarRatingProps {
  rating: number;
  size?: "sm" | "md";
}

export function StarRating({ rating, size = "md" }: StarRatingProps) {
  const starClass = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`flex items-center gap-0.5 ${starClass}`} aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full = star <= Math.floor(rating);
        const half = !full && star - 0.5 <= rating;
        return (
          <span
            key={star}
            className={
              full
                ? "text-amber-400"
                : half
                ? "text-amber-300"
                : "text-warm-muted opacity-30"
            }
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
