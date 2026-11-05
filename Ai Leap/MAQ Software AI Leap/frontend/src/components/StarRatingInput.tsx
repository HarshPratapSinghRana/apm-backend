import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export const StarRatingInput = ({ value, onChange, disabled, size = "md" }: StarRatingInputProps) => {
  const [hover, setHover] = useState(0);
  const sz = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={`p-0.5 transition-colors ${disabled ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => !disabled && onChange(star)}
        >
          <Star
            className={`${sz} transition-colors ${
              star <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300 dark:text-gray-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

interface StarRatingDisplayProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}

export const StarRatingDisplay = ({ rating, count, size = "sm" }: StarRatingDisplayProps) => {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sz} ${
              star <= fullStars
                ? "fill-amber-400 text-amber-400"
                : star === fullStars + 1 && hasHalf
                ? "fill-amber-400/50 text-amber-400"
                : "fill-none text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-muted-foreground">
        {rating > 0 ? rating.toFixed(1) : "—"}
        {count !== undefined && <span className="ml-0.5">({count})</span>}
      </span>
    </div>
  );
};
