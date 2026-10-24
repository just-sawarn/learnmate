"use client";

import { useRef, type CSSProperties } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface FallingTextProps {
  text: string;
  className?: string;
  /** Extra classes for each word (gradient text must sit on the moving element). */
  wordClassName?: string;
  /** Seconds before the first word starts falling. */
  delay?: number;
  stagger?: number;
  /** "mount" plays on first paint, "view" when scrolled into view. */
  trigger?: "mount" | "view";
  /** Play the exit instead: words fall out through the bottom of their mask. */
  leaving?: boolean;
}

/**
 * Words drop out of an overflow mask and settle on the baseline. The motion is a CSS keyframe
 * animation on transform only, so it runs on the compositor and never competes with scrolling.
 * Join words with a no-break space to keep them as one unit.
 */
export function FallingText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.06,
  trigger = "mount",
  leaving = false,
}: FallingTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const state = leaving ? "out" : trigger === "mount" || seen ? "in" : "hidden";
  const words = text.split(" ");
  const vars = {
    "--delay": `${Math.round(delay * 1000)}ms`,
    "--stagger": `${Math.round(stagger * 1000)}ms`,
  } as CSSProperties;

  return (
    <span ref={ref} className={cn("fall inline", className)} data-state={state} style={vars}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span
            className="inline-block overflow-hidden align-bottom"
            style={{ paddingBottom: "0.14em", marginBottom: "-0.14em" }}
          >
            <span className={cn("fall-word", wordClassName)} style={{ "--i": i } as CSSProperties}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
