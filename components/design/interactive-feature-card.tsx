"use client";

import type { PointerEvent, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type InteractiveFeatureCardProps = {
  children: ReactNode;
  className?: string;
};

/** Lift, border and a soft spotlight that follows a mouse. Touch and keyboard get lift and border only. */
export function InteractiveFeatureCard({ children, className }: InteractiveFeatureCardProps) {
  function moveSpotlight(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
    card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
  }

  return (
    <div className="interactive-card h-full" onPointerMove={moveSpotlight}>
      <Card
        className={cn("interactive-card__surface group relative h-full overflow-hidden", className)}
      >
        <span className="interactive-card__spotlight" aria-hidden="true" />
        <div className="relative z-10 h-full">{children}</div>
      </Card>
    </div>
  );
}
