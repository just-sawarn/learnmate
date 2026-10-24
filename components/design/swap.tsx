"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwapProps {
  /** Stage index (or any number). A change cross-fades from the old render to the new one. */
  value: number;
  /** `dir` is +1 when moving forward, -1 when moving back; `phase` is "out" for the leaving layer. */
  render: (value: number, phase: "in" | "out", dir: 1 | -1) => ReactNode;
  className?: string;
  /** How long the outgoing layer stays mounted. */
  outMs?: number;
}

/**
 * Keeps at most two layers mounted (the new one and the one leaving) and animates both with CSS.
 * Replaces AnimatePresence for the hot path: no JS animation runs while the user scrolls.
 */
export function Swap({ value, render, className, outMs = 260 }: SwapProps) {
  const [state, setState] = useState<{ cur: number; prev: number | null; dir: 1 | -1 }>({
    cur: value,
    prev: null,
    dir: 1,
  });

  if (state.cur !== value) {
    setState({ cur: value, prev: state.cur, dir: value > state.cur ? 1 : -1 });
  }

  useEffect(() => {
    if (state.prev === null) return;
    const t = setTimeout(() => setState((s) => ({ ...s, prev: null })), outMs);
    return () => clearTimeout(t);
  }, [state.prev, state.cur, outMs]);

  return (
    <div className={cn("grid", className)}>
      {state.prev !== null && (
        <div
          key={`out-${state.prev}`}
          aria-hidden="true"
          className="swap-out min-h-0 min-w-0 [grid-area:1/1]"
        >
          {render(state.prev, "out", state.dir)}
        </div>
      )}
      <div key={`in-${state.cur}`} className="swap-in min-h-0 min-w-0 [grid-area:1/1]">
        {render(state.cur, "in", state.dir)}
      </div>
    </div>
  );
}
