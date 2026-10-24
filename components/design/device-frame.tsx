import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DeviceFrameProps {
  children: ReactNode;
  /** Address shown in the browser bar (desktop) and status pill (phone). */
  address?: string;
  badge?: string;
  /** Optional thin bar under the chrome (subject switcher). Always the same height, so nothing shifts. */
  toolbar?: ReactNode;
  className?: string;
}

/**
 * Responsive frame: a browser window from sm up, a phone bezel below. The screen is a size
 * container, so scenes lay out from the frame's width rather than the viewport's.
 */
export function DeviceFrame({
  children,
  address = "learnmate.app",
  badge = "Demo data",
  toolbar,
  className,
}: DeviceFrameProps) {
  return (
    <div
      className={cn(
        "device-shell mx-auto flex min-h-0 w-full flex-col overflow-hidden rounded-[1.9rem] border-[5px] max-sm:max-w-[26rem] sm:rounded-2xl sm:border",
        className,
      )}
    >
      <div className="device-chrome relative flex shrink-0 items-center gap-3 border-b px-3 py-2">
        <span aria-hidden="true" className="hidden gap-1.5 sm:flex">
          <i className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-1.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-foreground/20 sm:hidden"
        />
        <span className="mx-auto truncate rounded-md bg-background/70 px-3 py-0.5 text-[10px] text-muted-foreground max-sm:mt-2 sm:mx-0 sm:flex-1 sm:text-center sm:text-xs">
          {address}
        </span>
        <span className="hidden shrink-0 rounded-full border bg-card/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          {badge}
        </span>
      </div>
      {toolbar !== undefined && (
        <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 text-[10px] text-muted-foreground sm:text-[11px]">
          {toolbar}
        </div>
      )}
      <div className="@container relative min-h-0 flex-1 bg-card">{children}</div>
    </div>
  );
}
