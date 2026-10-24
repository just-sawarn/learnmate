"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { EASE } from "@/components/design/lm-kit";

/**
 * Content that drops down out of the sticky header as it scrolls into view: it starts a little
 * higher, clipped from the bottom, and settles into place. It replays when you scroll back up.
 * `enabled={false}` renders the children untouched, which is how to switch the effect off.
 */
export function DropFromHeader({
  children,
  enabled = true,
  delay = 0,
  amount = 0.2,
  className,
}: {
  children: ReactNode;
  enabled?: boolean;
  delay?: number;
  /** How much of the block must be visible to trigger. Use "some" for very tall blocks. */
  amount?: number | "some";
  className?: string;
}) {
  // The observer watches this plain wrapper: a clipped element would always look invisible to it.
  const watch = useRef<HTMLDivElement>(null);
  const shown = useInView(watch, { amount, margin: "-64px 0px 0px 0px" });
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <div ref={watch} className={className}>
      <motion.div
        data-reveal
        initial={false}
        animate={
          shown
            ? { opacity: 1, y: 0, clipPath: "inset(0 -50vw -2% -50vw)" }
            : { opacity: 0, y: -56, clipPath: "inset(0 -50vw 100% -50vw)" }
        }
        transition={{ duration: 0.75, ease: EASE, delay: shown ? delay : 0 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
