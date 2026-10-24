"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMotionValue, useMotionValueEvent, useScroll } from "framer-motion";
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
/** Pixels of scroll the sticky panel is pinned below the 64px site header. */
const HEADER = 64;
/** Boundary slack, in stage units, so hovering on a boundary never flickers between stages. */
const HYSTERESIS = 0.04;
/** Scene progress is quantised so React re-renders ~120 times per stage, not once per scroll event. */
const STEPS = 120;

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

interface View {
  stage: number;
  p: number;
}

export function ScrollShowcase({ href, header }: { href: string; header?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  // One authoritative progress value (0..1). Scrolling drives it; with reduced motion the stepper does.
  const { scrollYProgress } = useScroll({ target: root, offset: [`start ${HEADER}px`, "end end"] });
  const manual = useMotionValue(0.5 / COUNT);
  const progress = reduced ? manual : scrollYProgress;

  const [view, setView] = useState<View>({ stage: 0, p: 0 });
  const stageRef = useRef(0);
  // A manual subject choice belongs to the stage it was made on. Scrolling to another stage drops it,
  // so the story always resumes from its own default and never fights the visitor mid-stage.
  const [override, setOverride] = useState<{ stage: number; subject: Subject } | null>(null);

  const sync = useCallback((v: number) => {
    const raw = Math.min(COUNT - 1e-6, Math.max(0, v * COUNT));
    let s = stageRef.current;
    if (raw > s + 1 + HYSTERESIS || raw < s - HYSTERESIS) s = Math.floor(raw);
    stageRef.current = s;
    const p = Math.round(Math.min(1, Math.max(0, raw - s)) * STEPS) / STEPS;
    setView((prev) => (prev.stage === s && prev.p === p ? prev : { stage: s, p }));
  }, []);

  useMotionValueEvent(progress, "change", sync);
  // Reduced motion shows each stage in its finished state; the first paint syncs from the default view.
  const stage = view.stage;
  const p = reduced ? 0.95 : view.p;
  const current = STORY_STAGES[stage];
  const subjectAware = SUBJECT_STAGES.includes(stage);
  const subject: Subject = override && override.stage === stage ? override.subject : "python";

  const select = useCallback(
    (index: number) => {
      const target = (index + 0.5) / COUNT;
      if (reduced) {
        manual.set(target);
        sync(target);
        return;
      }
      const el = root.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const range = el.offsetHeight - window.innerHeight + HEADER;
      window.scrollTo({ top: top - HEADER + range * target, behavior: "smooth" });
    },
    [manual, reduced, sync],
  );

  return (
    <div ref={root} className="story" data-static={reduced}>
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
        <div className="relative flex h-full flex-col justify-center gap-2 py-2 sm:gap-3 sm:py-3 lg:gap-5 lg:py-3">
          {header}
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] items-center gap-2 lg:flex-none lg:items-center sm:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-1 lg:gap-12">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs lg:hidden">
                <span className="brand-fill h-1.5 w-6 rounded-full" aria-hidden="true" />
                Step {current.step + 1} of 4 · {STORY_STEPS[current.step].title}
              </p>
              <ol
                className="relative m-0 hidden list-none flex-col gap-3 p-0 lg:flex"
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
                address={`learnmate.app / ${current.label.toLowerCase()}`}
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
                className="h-full min-h-[18rem] sm:max-h-[34rem] lg:h-[clamp(22rem,calc(100svh-20rem),32rem)]"
              >
                <Swap
                  value={stage}
                  className="absolute inset-0 grid-rows-[minmax(0,1fr)]"
                  render={(v, phase, dir) => (
                    <MemoScene
                      stage={v}
                      // The leaving scene freezes at the end state it was scrolled out of.
                      p={phase === "out" ? (dir > 0 ? 1 : 0) : p}
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
