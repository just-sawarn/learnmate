import { cn } from "@/lib/utils";

/*
 * rohmbic brand marks (Direction B, brand identity v1.0).
 *
 * Symbol: one rhombus, 92 x 84, divided on its vertical axis. The left triangle is an outline (a flat
 * page, stroke 8 of 100 units); the right triangle is solid and points forward (the page lifted into
 * motion, and a play button). The gap between the halves equals the stroke.
 *
 * Wordmark: lowercase, drawn from monoline strokes of the same 8-unit weight with flat, square
 * terminals; the dot of the i is a tall rhombus. Both use currentColor, so they are ink or off white
 * only and are never tinted.
 */

export function RohmbicMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 92 84"
      className={cn("h-6 w-auto shrink-0", className)}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* outlined left half: outer triangle with the inset triangle cut out */}
      <path fillRule="evenodd" d="M42 3.7L0 42L42 80.3Z M34 21.8L11.9 42L34 62.2Z" />
      {/* solid right half */}
      <path d="M50 3.7L92 42L50 80.3Z" />
    </svg>
  );
}

export function RohmbicWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-4 -2 410 88"
      className={cn("h-6 w-auto shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {/* r */}
      <path d="M4 30V80M4 56Q4 34 28 34" />
      {/* o */}
      <ellipse cx="68" cy="55" rx="24" ry="25" />
      {/* h */}
      <path d="M112 0V80M112 52C112 36 122 32 134 32C146 32 154 38 154 52V80" />
      {/* m */}
      <path d="M178 30V80M178 52C178 38 186 32 196 32C206 32 212 38 212 52V80M212 52C212 38 220 32 230 32C240 32 246 38 246 52V80" />
      {/* b */}
      <path d="M262 0V80" />
      <ellipse cx="286" cy="55" rx="24" ry="25" />
      {/* i: stem, with a tall rhombus for the dot */}
      <path d="M332 30V80" />
      <path d="M332 0L339 11L332 22L325 11Z" fill="currentColor" stroke="none" />
      {/* c */}
      <path d="M392.4 39A24 25 0 1 0 392.4 71" />
    </svg>
  );
}

/** Horizontal lockup: symbol and wordmark at the same height. Purely presentational. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const h = size === "lg" ? "h-9" : "h-[1.15rem] sm:h-6";
  return (
    <span className={cn("inline-flex items-center gap-2 sm:gap-2.5", className)}>
      <RohmbicMark className={h} />
      <RohmbicWordmark className={h} />
      <span className="sr-only">rohmbic</span>
    </span>
  );
}
