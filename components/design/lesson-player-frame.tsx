import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PlayerSegment {
  /** Relative length (the scene's duration). */
  weight: number;
  /** 0 to 1: how much of this scene has played. */
  fill: number;
  label: string;
}

type LessonPlayerFrameProps = {
  title: string;
  playing?: boolean;
  /** The animated scene goes here. */
  children: ReactNode;
  /** Sits over the stage: the start button, the paused hint, the end-of-lesson card. */
  overlay?: ReactNode;
  segments: PlayerSegment[];
  /** Index of the scene being played. */
  current: number;
  voiceOn?: boolean;
  onPlayPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onRestart?: () => void;
  onSeek?: (scene: number) => void;
  onToggleVoice?: () => void;
  className?: string;
};

/**
 * The lesson player: the stage, then one control bar directly under it that is always in view. The stage is sized to
 * the window height (16:9, never taller than the screen leaves room for), so the controls never fall below the fold.
 */
export function LessonPlayerFrame({
  title,
  playing = false,
  children,
  overlay,
  segments,
  current,
  voiceOn = true,
  onPlayPause,
  onPrevious,
  onNext,
  onRestart,
  onSeek,
  onToggleVoice,
  className,
}: LessonPlayerFrameProps) {
  // Full screen takes the stage and its controls together, so everything keeps working there.
  const root = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.().catch(() => undefined);
  }, []);
  const button =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground disabled:opacity-40";
  return (
    <section
      ref={root}
      aria-label={title}
      className={cn(
        "mx-auto w-full",
        fullscreen && "flex flex-col items-center justify-center bg-background p-4",
        className,
      )}
      style={{
        maxWidth: fullscreen
          ? "min(100%, calc((100vh - 6.5rem) * 16 / 9))"
          : "min(100%, calc((100vh - 13.5rem) * 16 / 9))",
      }}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
        {children}
        {overlay}
      </div>
      <div className="mt-3 flex w-full items-center gap-1.5 rounded-2xl border bg-card px-2.5 py-2 shadow-sm sm:gap-2 sm:px-3">
        <button
          type="button"
          aria-label="Restart lesson"
          title="Restart lesson"
          className={button}
          onClick={onRestart}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Previous scene"
          title="Previous scene"
          className={button}
          onClick={onPrevious}
          disabled={current <= 0}
        >
          <SkipBack className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause (space)" : "Play (space)"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          onClick={onPlayPause}
        >
          {playing ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label="Next scene"
          title="Next scene"
          className={button}
          onClick={onNext}
          disabled={current >= segments.length - 1}
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>

        <div
          role="list"
          aria-label="Lesson progress. Choose a scene to jump to it."
          className="mx-1.5 flex min-w-0 flex-1 items-center gap-1 sm:mx-2"
        >
          {segments.map((s, i) => (
            <button
              key={i}
              role="listitem"
              type="button"
              title={`Scene ${i + 1}`}
              aria-label={`Scene ${i + 1} of ${segments.length}${i === current ? " (playing)" : ""}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => onSeek?.(i)}
              className="group flex h-6 items-center"
              style={{ flex: s.weight }}
            >
              <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted transition-[height] group-hover:h-2.5">
                <span
                  className="block h-full rounded-full bg-foreground"
                  style={{ width: `${Math.round(Math.min(1, Math.max(0, s.fill)) * 100)}%` }}
                />
              </span>
            </button>
          ))}
        </div>

        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {Math.min(current + 1, segments.length)} / {segments.length}
        </span>
        <button
          type="button"
          aria-label={voiceOn ? "Mute narration" : "Unmute narration"}
          aria-pressed={!voiceOn}
          title={voiceOn ? "Mute narration" : "Unmute narration"}
          className={button}
          onClick={onToggleVoice}
        >
          {voiceOn ? (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          title={fullscreen ? "Exit full screen (f)" : "Full screen (f)"}
          className={button}
          onClick={toggleFullscreen}
        >
          {fullscreen ? (
            <Minimize className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </section>
  );
}
