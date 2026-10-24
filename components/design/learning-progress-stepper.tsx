"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { Check } from "lucide-react";
import { STORY_STAGES } from "@/components/design/story-stages";
import { cn } from "@/lib/utils";

interface StepperProps {
  /** Overall story progress, 0..1: the same value that drives the renderer. */
  progress: MotionValue<number>;
  active: number;
  onSelect: (index: number) => void;
}

const COUNT = STORY_STAGES.length;

export function LearningProgressStepper({ progress, active, onSelect }: StepperProps) {
  const scroller = useRef<HTMLDivElement>(null);
  // Stage i is centred at progress (i + 0.5) / COUNT, so the fill reaches a dot as that stage arrives.
  const fill = useTransform(progress, (v) =>
    Math.min(1, Math.max(0, (v * COUNT - 0.5) / (COUNT - 1))),
  );

  // On narrow screens the track scrolls sideways: keep the active step in view without moving the page.
  useEffect(() => {
    const el = scroller.current;
    const btn = el?.querySelectorAll<HTMLElement>("[data-step]")[active];
    if (!el || !btn || el.scrollWidth <= el.clientWidth) return;
    const li = btn.parentElement as HTMLElement;
    el.scrollTo({
      left: li.offsetLeft - (el.clientWidth - li.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [active]);

  return (
    <nav
      aria-label="Learning journey"
      className="rounded-2xl border bg-card/90 px-2 py-2 shadow-sm sm:px-4 sm:py-2.5"
    >
      <div ref={scroller} className="step-scroller -my-1 overflow-x-auto overscroll-x-contain py-1">
        <ol className="relative flex min-w-max lg:min-w-0">
          <span
            aria-hidden="true"
            className="absolute top-[1.25rem] h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-border"
            style={{ left: `${50 / COUNT}%`, right: `${50 / COUNT}%` }}
          >
            <motion.span className="brand-fill block h-full origin-left" style={{ scaleX: fill }} />
          </span>
          {STORY_STAGES.map((stage, i) => {
            const done = i < active;
            const current = i === active;
            const Icon = stage.icon;
            return (
              <li key={stage.id} className="flex-1 basis-0" style={{ minWidth: "4.5rem" }}>
                <button
                  type="button"
                  data-step
                  onClick={() => onSelect(i)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${i + 1} of ${COUNT}: ${stage.label}${done ? ", completed" : ""}`}
                  className="group relative flex min-h-11 w-full flex-col items-center gap-1 rounded-xl py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <span
                    className={cn(
                      "step-dot relative flex h-9 w-9 items-center justify-center rounded-full border",
                      current &&
                        "brand-fill scale-110 border-transparent text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-2)_22%,transparent),0_8px_20px_-6px_var(--brand-2)]",
                      done && "border-transparent bg-foreground text-background",
                      !current &&
                        !done &&
                        "bg-card text-muted-foreground group-hover:border-foreground/40 group-hover:text-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] leading-none font-medium transition-colors sm:text-xs",
                      current
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {stage.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
