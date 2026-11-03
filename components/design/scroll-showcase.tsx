"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useInView, useMotionValue, type MotionValue } from "framer-motion";
import { useDerived } from "@/components/design/lm-kit";
import { DeviceFrame } from "@/components/design/device-frame";
import { FallingText } from "@/components/design/falling-text";
import { LearningProgressStepper } from "@/components/design/learning-progress-stepper";
import { Swap } from "@/components/design/swap";
import { StoryScene } from "@/components/design/story-scenes";
import { SubjectSwitcher } from "@/components/design/subject-switcher";
import { STORY_STAGES, STORY_STEPS, SUBJECT_STAGES } from "@/components/design/story-stages";
import { cn } from "@/lib/utils";
import type { Subject } from "@/components/design/teaching-data";

const COUNT = STORY_STAGES.length;
const MemoScene = memo(StoryScene);

/** The one component that follows the clock: it re-renders as progress moves, nothing around it does. */
function LiveScene({
  p,
  pMV,
  still,
  ...rest
}: {
  stage: number;
  p?: number;
  pMV: MotionValue<number>;
  still: boolean;
  href: string;
  subject: Subject;
  onAdvance: () => void;
}) {
  const live = useDerived(pMV, (v) => v);
  return <MemoScene {...rest} p={p ?? (still ? 0.95 : live)} />;
}
/** How long each stage plays before the next begins. */
const STAGE_MS = 6500;
/** Progress resolution: fine enough that the scene advances on every display frame (no visible stepping). */
const STEPS = 1000;

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * A self-playing walkthrough. One clock drives the stage and its progress; nothing depends on scroll,
 * so visitors can scroll straight past it. It plays only while on screen and loops, whatever the
 * pointer is doing. Clicking a stage jumps there and keeps playing.
 */
export function ScrollShowcase({ href, header }: { href: string; header?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const onScreen = useInView(root, { amount: 0.25 });

  // Only the stage lives in React state. Progress inside a stage is a motion value that just the
  // scene subscribes to, so the shell (titles, tracker, stepper, frame) re-renders once per stage.
  const [stage, setStage] = useState(0);
  const pMV = useMotionValue(0);
  // The stepper fill follows the same clock through a motion value, so it never re-renders React.
  const progress = useMotionValue(0.5 / COUNT);
  // A manual subject choice belongs to the stage it was made on and is dropped when the story moves on.
  const [override, setOverride] = useState<{ stage: number; subject: Subject } | null>(null);

  const clock = useRef({ stage: 0, ms: 0 });
  const publish = useCallback(() => {
    const { stage, ms } = clock.current;
    const p = Math.round(Math.min(1, ms / STAGE_MS) * STEPS) / STEPS;
    progress.set((stage + 0.5 + (p - 0.5)) / COUNT);
    pMV.set(p);
    setStage(stage);
  }, [progress, pMV]);

  useEffect(() => {
    if (reduced || !onScreen) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const c = clock.current;
      c.ms += dt;
      if (c.ms >= STAGE_MS) {
        c.ms = 0;
        c.stage = (c.stage + 1) % COUNT;
      }
      publish();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, onScreen, publish]);

  // Reduced motion shows each stage in its finished state; the stepper moves between them.
  const current = STORY_STAGES[stage];
  const subjectAware = SUBJECT_STAGES.includes(stage);
  const subject: Subject = override && override.stage === stage ? override.subject : "python";

  const select = useCallback(
    (index: number) => {
      clock.current = { stage: index, ms: reduced ? STAGE_MS : 0 };
      publish();
    },
    [publish, reduced],
  );

  return (
    <div ref={root} className="story" data-static="true">
      <div className="story-sticky">
        <div aria-hidden="true" className="story-glows">
          {STORY_STAGES.map((st, i) => (
            <div
              key={st.id}
              className="story-glow"
              data-on={i === stage}
              style={{ "--g-a": st.glow[0], "--g-b": st.glow[1] } as CSSProperties}
            />
          ))}
        </div>
        <div className="relative flex h-full flex-col justify-center gap-5 py-2 sm:gap-6 sm:py-3 lg:gap-7 lg:py-3">
          {header}
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] items-center gap-4 lg:flex-none lg:items-center sm:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-1 lg:gap-12">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs lg:hidden">
                <span className="brand-fill h-1.5 w-6 rounded-full" aria-hidden="true" />
                Step {current.step + 1} of 4 · {STORY_STEPS[current.step].title}
              </p>
              <ol
                className="relative m-0 hidden list-none flex-col gap-4 p-0 lg:flex"
                aria-label="The four steps"
              >
                {STORY_STEPS.map((st, i) => {
                  const on = current.step === i;
                  const first = STORY_STAGES.findIndex((g) => g.step === i);
                  return (
                    <li key={st.title}>
                      <button
                        type="button"
                        onClick={() => select(first)}
                        aria-current={on ? "step" : undefined}
                        className="group flex w-full items-start gap-4 rounded-xl py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors duration-300",
                            on ? "border-ink bg-ink text-bg" : "bg-surface text-lm-muted",
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block pt-1.5 text-xl font-semibold tracking-[-0.01em] transition-colors duration-300",
                              on ? "text-ink" : "text-lm-muted group-hover:text-ink",
                            )}
                          >
                            {st.title}
                          </span>
                          <span
                            className="moment-panel story-tracker-body block"
                            data-open={on}
                            aria-hidden={!on}
                          >
                            <span className="min-h-0 overflow-hidden pt-1 text-base leading-7 text-ink-2">
                              {st.body}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <h3
                aria-live="polite"
                className="mt-1.5 min-h-[2.2em] text-[1.65rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:mt-3 sm:text-4xl md:min-h-[1.15em] lg:mt-6 lg:min-h-[1.1em] lg:text-[2.5rem]"
              >
                <Swap
                  value={stage}
                  outMs={300}
                  render={(v, phase) => (
                    <FallingText
                      text={STORY_STAGES[v].title}
                      stagger={0.045}
                      leaving={phase === "out"}
                    />
                  )}
                />
              </h3>
              <div className="mt-2 sm:mt-4 sm:min-h-[4.5rem] lg:min-h-[5.5rem]">
                <Swap
                  value={stage}
                  render={(v) => (
                    <p className="max-w-md text-sm leading-6 text-pretty text-muted-foreground max-sm:sr-only sm:text-base sm:leading-7 md:max-w-xl lg:max-w-md">
                      {STORY_STAGES[v].body}
                    </p>
                  )}
                />
              </div>
            </div>

            <div className="min-h-0 self-stretch lg:self-center">
              <DeviceFrame
                address={`rohmbic.com / ${current.label.toLowerCase()}`}
                toolbar={
                  <>
                    <span className="truncate">
                      {subjectAware && subject !== "python"
                        ? `Viewing ${subject.toUpperCase()}. Scroll on to continue the story.`
                        : "Illustrative demo · not live data"}
                    </span>
                    <span
                      className={subjectAware ? undefined : "invisible"}
                      aria-hidden={!subjectAware}
                    >
                      <SubjectSwitcher
                        value={subject}
                        onChange={(next) => setOverride({ stage, subject: next })}
                      />
                    </span>
                  </>
                }
                className="h-[27rem] sm:h-[28rem] lg:h-[clamp(22rem,calc(100svh-20rem),32rem)]"
              >
                <Swap
                  value={stage}
                  className="absolute inset-0 grid-rows-[minmax(0,1fr)]"
                  render={(v, phase, dir) => (
                    <LiveScene
                      stage={v}
                      // The leaving scene freezes at the end state it was scrolled out of.
                      p={phase === "out" ? (dir > 0 ? 1 : 0) : undefined}
                      pMV={pMV}
                      still={reduced}
                      href={href}
                      subject={v === stage ? subject : "python"}
                      onAdvance={() => select(5)}
                    />
                  )}
                />
              </DeviceFrame>
            </div>
          </div>

          <LearningProgressStepper progress={progress} active={stage} onSelect={select} />
        </div>
      </div>
    </div>
  );
}
