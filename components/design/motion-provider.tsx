"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Production honours the visitor's reduced-motion setting. In development it is ignored so the
 * "reduced motion is enabled" console warning doesn't appear and animations can be inspected.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion={process.env.NODE_ENV === "production" ? "user" : "never"}>
      {children}
    </MotionConfig>
  );
}
