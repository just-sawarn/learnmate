"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ArrowRight,
  FileText,
  HelpCircle,
  Pause,
  Play,
  SquareTerminal,
  Terminal,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  BrowserFrame,
  CaptionTyper,
  CodeTyper,
  Cursor,
  EASE,
  GuruBubble,
  Meter,
  PageChip,
  PdfIcon,
  ProviderChip,
  ScaledStage,
  SPRING,
  StatusPill,
  TestIcon,
  TestRow,
  VariableBox,
  reveal,
  stagger,
  useBeat,
  useDerived,
  usePlayhead,
  useRamp,
  type Mastery,
  type TestState,
  useReduce,
} from "@/components/design/lm-kit";
import { cn } from "@/lib/utils";

/*
 * The hero demo: six scenes on one clock. A PDF is dropped and split into topics, a for-loop lesson
 * plays, a checkpoint opens an IDE where a test fails, Guru asks a question citing page 6, the code
 * is fixed and Loops moves from weak to strong. Illustrative only: nothing here calls the backend.
 */

const SCENES = [
  { id: "upload", label: "Upload", duration: 2600 },
  { id: "topics", label: "Topic map", duration: 2600 },
  { id: "lesson", label: "Lesson", duration: 5200 },
  { id: "checkpoint", label: "Checkpoint", duration: 3600 },
  { id: "guru", label: "Guru", duration: 4000 },
  { id: "fixed", label: "Fixed", duration: 3400 },
] as const;

const BUGGY = "for i in range(5):\n    print(i)";
const FIXED = "for i in range(1, 5):\n    print(i)";
const TESTS = ["prints 5 lines", "starts at 0", "ends at 4"];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Clock = MotionValue<number>;

/* ---------- scene scaffolding ---------- */

function Layer({ children, fadeIn = false }: { children: ReactNode; fadeIn?: boolean }) {
  return (
    <motion.div
      className="absolute inset-x-4 top-[52px] bottom-4"
      initial={fadeIn ? { opacity: 0 } : false}
      animate={{ opacity: 1, transition: { duration: 0.4 } }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      {children}
    </motion.div>
  );
}

function Fade({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Settle({ children, delay = 0.25 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay, duration: 0.25 } }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- cards used across scenes ---------- */

const CURSOR_ON = { x: 676, y: 20 };
const CURSOR_OFF = { x: 560, y: 210 };

function Ide({
  code,
  tests,
  output,
  tip,
  checkPressed = false,
  slideIn = false,
  bug = false,
  bugVisible = true,
}: {
  code: { text: string; from?: string; progress: MotionValue<number> | number };
  tests: TestState[];
  output?: string | null;
  tip?: ReactNode;
  checkPressed?: boolean;
  slideIn?: boolean;
  bug?: boolean;
  bugVisible?: boolean;
}) {
  return (
    <div className="absolute top-0 left-[252px] h-[336px] w-[476px] overflow-hidden rounded-[14px] border border-line bg-surface shadow-raised">
      <motion.div
        className="h-full"
        initial={slideIn ? { x: 120, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 190, damping: 26, delay: slideIn ? 0.3 : 0 }}
      >
        <div className="flex h-[34px] items-center gap-2 border-b border-line px-3">
          <span className="flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-ink">
            <SquareTerminal size={12} aria-hidden="true" /> loops.py
          </span>
          <span className="ml-auto flex h-6 w-[52px] items-center justify-center rounded-full border border-ink text-xs font-medium text-ink">
            Run
          </span>
          <motion.span
            className="flex h-6 w-16 items-center justify-center rounded-full bg-ink text-xs font-medium text-bg"
            animate={{ scale: checkPressed ? 0.9 : 1 }}
            transition={{ duration: 0.12 }}
          >
            Check
          </motion.span>
        </div>
        <div className="flex flex-col gap-1.5 px-3 pt-2.5">
          <div className="relative h-[64px] rounded-[12px] bg-surface-2 px-3 py-[10px]">
            <CodeTyper text={code.text} from={code.from} progress={code.progress} lineNumbers />
            {bug && (
              <svg
                className="absolute top-[27px] left-[110px]"
                width="86"
                height="6"
                viewBox="0 0 86 6"
                fill="none"
                aria-hidden="true"
              >
                <motion.path
                  d={`M0 3 q2.5 -3 5 0${" t5 0".repeat(16)}`}
                  stroke="var(--lm-ink)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: bugVisible ? 1 : 0, opacity: bugVisible ? 1 : 0 }}
                  transition={{ duration: bugVisible ? 0.6 : 0.25, ease: EASE }}
                />
              </svg>
            )}
          </div>
          <div className="flex h-[112px] flex-col gap-[3px]">
            <p className="m-0 flex h-[18px] items-center justify-between text-xs font-medium tracking-wide text-lm-muted uppercase">
              Hidden tests
              <span className="font-mono normal-case">
                {tests.filter((s) => s === "pass").length}/3
              </span>
            </p>
            {TESTS.map((label, i) => (
              <TestRow key={label} label={label} state={tests[i]} className="py-[3px]" />
            ))}
          </div>
          <div className="h-[22px]">
            <AnimatePresence>{tip}</AnimatePresence>
          </div>
          <div className="h-[56px] rounded-[12px] bg-ink px-3 py-1.5 font-mono text-[13px] leading-[19px] text-bg">
            <div className="text-bg/60">$ python loops.py</div>
            <div>{output ?? " "}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function LoopsCard({ tall }: { tall: boolean }) {
  return (
    <motion.div
      className={cn(
        "absolute top-0 left-0 w-[240px] overflow-hidden rounded-[14px] border border-ink bg-surface shadow-raised",
        tall ? "h-[336px]" : "h-[128px]",
      )}
    >
      <Settle>
        <div className="flex h-[34px] items-center justify-between border-b border-line px-3">
          <span className="text-[13px] font-semibold text-ink">Loops</span>
          <PageChip page={6} />
        </div>
        <div className="px-3 pt-2.5">
          <div className="rounded-[10px] bg-surface-2 px-2.5 py-1.5">
            <CodeTyper text={BUGGY} progress={1} caret={false} className="text-xs" />
          </div>
        </div>
        {tall ? (
          <div className="absolute inset-x-3 top-[118px] rounded-[12px] border border-ink bg-surface p-3 shadow-raised">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Play size={12} className="fill-ink" aria-hidden="true" /> Your turn
            </div>
            <p className="m-0 mt-1.5 text-[13px] leading-[1.45] text-ink-2">
              Print the numbers 0 to 4, one per line. (Worksheet Q3, p. 6)
            </p>
          </div>
        ) : (
          <p className="absolute bottom-2.5 left-3 m-0 flex items-center gap-1.5 text-xs text-lm-muted">
            <Pause size={11} className="fill-lm-muted" aria-hidden="true" /> Paused at checkpoint
          </p>
        )}
      </Settle>
    </motion.div>
  );
}

function MasteryCard({ value, status }: { value: number; status: Mastery }) {
  return (
    <div className="absolute top-0 left-0 h-[128px] w-[240px] overflow-hidden rounded-[14px] border border-ink bg-surface p-3 shadow-raised">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">Loops</span>
        <StatusPill status={status} />
      </div>
      <Meter label="Mastery" value={value} />
      <p className="m-0 mt-3 text-xs text-lm-muted">Updates after every Check</p>
    </div>
  );
}

function GuruPanel({ progress, rise }: { progress: MotionValue<number> | number; rise: boolean }) {
  return (
    <div className="absolute bottom-0 left-0 w-[240px]">
      <motion.div
        initial={rise ? { y: 60, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
      >
        <GuruBubble
          text="What's the first number range(1, 5) gives you? Compare it with what the worksheet expects on p. 6."
          progress={progress}
        />
      </motion.div>
    </div>
  );
}

function PlanBanner() {
  return (
    <motion.div
      className="absolute top-[-44px] left-1/2 z-20 -ml-[260px] flex h-7 w-[520px] items-center gap-2 rounded-full border border-ink bg-ink pr-4 pl-1 text-xs text-bg shadow-raised"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING}
    >
      <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-semibold text-ink">Plan v2</span>
      Loops moved from weak to strong. Next focus: Lists.
    </motion.div>
  );
}

function GroqTip({ text }: { text: string }) {
  return (
    <motion.div
      className="flex h-[22px] items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 text-xs text-ink-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
    >
      <Zap size={11} className="fill-ink text-ink" aria-hidden="true" />
      <span className="font-semibold text-ink">Groq</span> {text}
      <span className="ml-auto font-mono text-lm-muted">0.4s</span>
    </motion.div>
  );
}

/* ---------- flowchart for the lesson scene ---------- */

function tokenAt(ms: number) {
  const top = { x: 115, y: 18 };
  const loop = { x: 115, y: 67 };
  if (ms < 1650) return top;
  if (ms < 1900) {
    const k = (ms - 1650) / 250;
    return { x: lerp(top.x, loop.x, k), y: lerp(top.y, loop.y, k) };
  }
  if (ms < 4100) {
    const k = (((ms - 1900) / 2200) * 5) % 1;
    const path = [loop, { x: 115, y: 114 }, { x: 200, y: 114 }, { x: 200, y: 67 }, loop];
    const seg = Math.min(3, Math.floor(4 * k));
    const f = 4 * k - seg;
    return { x: lerp(path[seg].x, path[seg + 1].x, f), y: lerp(path[seg].y, path[seg + 1].y, f) };
  }
  const k = Math.min(1, Math.max(0, (ms - 4100) / 300));
  return { x: lerp(loop.x, 115, k), y: lerp(loop.y, 162, k) };
}

function Flowchart({ t }: { t: Clock }) {
  const x = useTransform(t, (v) => tokenAt(v).x - 6);
  const y = useTransform(t, (v) => tokenAt(v).y - 6);
  const box = "fill-surface stroke-ink";
  return (
    <div className="relative h-[190px] w-[230px]">
      <svg viewBox="0 0 230 190" className="absolute inset-0" fill="none">
        <g className="stroke-ink-2" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M115 30V52M115 82V100M115 128V132" />
          <path d="M165 114H200V67H175M179 63l-5 4 5 4" />
          <path d="M55 67H30V162H75M71 158l5 4-5 4" />
        </g>
        <rect x="75" y="6" width="80" height="24" rx="12" className={box} strokeWidth="1.4" />
        <rect x="55" y="52" width="120" height="30" rx="8" className={box} strokeWidth="1.4" />
        <rect x="65" y="100" width="100" height="28" rx="8" className={box} strokeWidth="1.4" />
        <rect
          x="75"
          y="150"
          width="80"
          height="24"
          rx="12"
          className="fill-surface-2 stroke-ink"
          strokeWidth="1.4"
        />
        <g className="fill-ink font-mono" fontSize="11" textAnchor="middle">
          <text x="115" y="22">
            start
          </text>
          <text x="115" y="71">
            i in range(5)?
          </text>
          <text x="115" y="118">
            print(i)
          </text>
          <text x="115" y="166">
            done
          </text>
        </g>
      </svg>
      <motion.span
        className="absolute top-0 left-0 size-3 rounded-full bg-ink shadow-[0_0_0_4px_rgb(var(--lm-shadow)/0.12)]"
        style={{ x, y }}
      />
    </div>
  );
}

function LessonScene({ t }: { t: Clock }) {
  const typed = useRamp(t, 700, 1900);
  const caption = useRamp(t, 900, 3300);
  const prog = useRamp(t, 600, 4500, 0, 0.92);
  const iVal = useDerived(t, (v) =>
    v < 1900 ? -1 : Math.min(4, Math.floor(((v - 1900) / 2200) * 5)),
  );
  const phase = useBeat(t, [700, 4500]);
  return (
    <>
      <div className="absolute inset-x-0 top-0 flex h-[34px] items-center justify-between border-b border-line px-4">
        <span className="text-[13px] font-semibold text-ink">
          Loops <span className="font-normal text-lm-muted">· repeating with for</span>
        </span>
        {phase >= 1 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING}
          >
            <PageChip page={6} />
          </motion.span>
        )}
      </div>
      <div className="absolute inset-x-0 top-[34px] flex h-[216px] gap-3 p-3">
        <div className="w-[236px] shrink-0 rounded-[12px] bg-surface-2 p-3">
          <p className="m-0 mb-2 font-mono text-xs text-lm-muted">lesson.py</p>
          <CodeTyper text={BUGGY} progress={typed} caret />
        </div>
        <div className="flex w-[190px] shrink-0 flex-col gap-2">
          <p className="m-0 text-xs font-medium tracking-wide text-lm-muted uppercase">Variables</p>
          <VariableBox name="i" value={iVal < 0 ? null : iVal} />
          <p className="m-0 mt-1 text-xs font-medium tracking-wide text-lm-muted uppercase">
            Output
          </p>
          <div className="flex-1 overflow-hidden rounded-[12px] bg-ink p-2.5 font-mono text-[13px] leading-[19px] text-bg">
            {Array.from({ length: Math.max(0, iVal + 1) }, (_, k) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {k}
              </motion.div>
            ))}
          </div>
        </div>
        <Flowchart t={t} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[86px] border-t border-line px-4 pt-2.5">
        <div className="rounded-[10px] bg-surface-2 px-3 py-1.5 text-center text-[13px] text-ink">
          <CaptionTyper
            text="range(5) gives you five numbers, starting at zero."
            progress={caption}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Pause size={14} className="fill-ink text-ink" aria-hidden="true" />
          <div className="relative h-1 flex-1 rounded-full bg-line">
            <motion.div
              className="h-full origin-left rounded-full bg-ink"
              style={{ scaleX: prog }}
            />
            <span className="absolute top-1/2 left-[92%] size-2 -translate-y-1/2 rotate-45 border border-ink bg-surface" />
          </div>
        </div>
      </div>
      {phase >= 2 && (
        <Fade className="absolute inset-x-0 top-[34px] z-10 flex h-[216px] items-center justify-center bg-surface/80">
          <div className="flex h-11 items-center gap-2 rounded-full border border-ink bg-surface px-5 text-[13px] font-semibold text-ink shadow-raised">
            <Play size={14} className="fill-ink" aria-hidden="true" /> Checkpoint · Your turn
          </div>
        </Fade>
      )}
    </>
  );
}

/* ---------- the six scenes ---------- */

const TOPICS = [
  { name: "Variables", page: 2 },
  { name: "Conditionals", page: 4 },
  { name: "Loops", page: 6 },
  { name: "Lists", page: 9 },
  { name: "Functions", page: 12 },
];
const slot = (i: number) => ({ left: 204 + (i % 3) * 178, top: 20 + 144 * Math.floor(i / 3) });
const QUIZ: TestState[] = ["pass", "pass", "fail", "pass", "fail"];
const STEPS_TEXT = ["Reading pages…", "Finding topics…", "Building exercises…"];

function UploadScene({ t }: { t: Clock }) {
  const s = useBeat(t, [650, 700, 1350, 1950]);
  const bar = useTransform(t, [700, 2400], [0, 1]);
  const label = Math.min(Math.max(s - 2, 0), STEPS_TEXT.length - 1);
  return (
    <Layer fadeIn>
      <Fade className="absolute top-0 left-0 w-full text-center text-[13px] text-lm-muted">
        Step 1 · Drop your study material
      </Fade>
      <motion.div
        className="absolute top-[28px] left-[184px] h-[200px] w-[360px] rounded-[20px] border-2 border-dashed border-ink/45 bg-surface-2/60"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: s >= 1 ? [1, 1.03, 1] : 1 }}
        transition={{ duration: s >= 1 ? 0.5 : 0.35, ease: EASE }}
      >
        <p className="absolute inset-x-0 bottom-3 m-0 text-center text-xs text-lm-muted">
          PDF up to 20 pages, or paste text
        </p>
        <AnimatePresence>
          {s >= 2 && (
            <motion.span
              className="absolute top-3 right-3"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ProviderChip provider="Gemini" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <motion.div
        className="absolute top-[58px] left-[279px] w-[170px]"
        initial={{ y: -150, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 170, damping: 17 }}
      >
        <PdfIcon name="python-loops-lists.pdf" />
      </motion.div>
      <Fade className="absolute top-[254px] left-[184px] w-[360px]">
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full origin-left rounded-full bg-ink" style={{ scaleX: bar }} />
        </div>
        <div className="relative mt-2 h-5 text-center text-[13px] font-medium text-ink-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {s >= 2 && (
              <motion.span
                key={label}
                className="absolute inset-x-0"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {STEPS_TEXT[label]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Fade>
    </Layer>
  );
}

function TopicsScene({ t }: { t: Clock }) {
  const s = useBeat(t, [350, 800, 1500, 1900]);
  const n = useDerived(t, (v) => Math.max(0, Math.min(5, Math.floor((v - 1550) / 90))));
  return (
    <Layer>
      <motion.div
        className="absolute w-[170px]"
        style={{ left: 4, top: 96 }}
        initial={false}
        animate={{ opacity: s >= 2 ? 0.35 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <PdfIcon name="python-loops-lists.pdf" />
      </motion.div>
      {TOPICS.map((_, i) => {
        const to = slot(i);
        const dx = to.left + 84 - 89;
        const dy = to.top + 66 - 138;
        return (
          <motion.div
            key={i}
            className="absolute h-[34px] w-[26px] rounded-[4px] border border-ink bg-surface"
            style={{ left: 76, top: 121 }}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.6 }}
            animate={
              s >= 2
                ? {
                    opacity: 0,
                    x: dx,
                    y: dy,
                    rotate: 0,
                    scale: 4.2,
                    transition: { duration: 0.55, delay: 0.05 * i, ease: EASE },
                  }
                : s >= 1
                  ? {
                      opacity: 1,
                      x: 52 + 9 * i,
                      y: (i - 2) * 16,
                      rotate: (i - 2) * 11,
                      scale: 1,
                      transition: { type: "spring", stiffness: 200, damping: 20, delay: 0.03 * i },
                    }
                  : { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.6 }
            }
          />
        );
      })}
      {TOPICS.map((tp, i) => {
        const pos = slot(i);
        const loops = tp.name === "Loops";
        return (
          <motion.div
            key={tp.name}
            className={cn(
              "absolute rounded-[14px] border bg-surface p-3 shadow-raised transition-colors duration-300",
              loops && s >= 4 ? "border-ink" : "border-line",
            )}
            style={{ left: pos.left, top: pos.top, width: 168, height: 132 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: s >= 2 ? 1 : 0, y: s >= 2 ? 0 : 10 }}
            transition={{ duration: 0.45, delay: s >= 2 ? 0.3 + 0.07 * i : 0, ease: EASE }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                {tp.name}
              </span>
              <PageChip page={tp.page} />
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-4/5 rounded-full bg-line" />
              <div className="h-1.5 w-3/5 rounded-full bg-line" />
            </div>
            <div className="absolute bottom-3 left-3 h-6">
              <AnimatePresence>
                {loops && s >= 4 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={SPRING}
                    className="inline-block origin-left"
                  >
                    <StatusPill status="weak" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
      <Fade
        className="absolute rounded-[14px] border border-dashed border-line bg-surface-2/60 p-3"
        style={{ ...slot(5), width: 168, height: 132, opacity: s >= 3 ? 1 : 0 }}
      >
        <p className="m-0 text-[13px] font-semibold text-ink">Diagnostic quiz</p>
        <p className="mt-0.5 mb-3 text-xs text-lm-muted">Marking your answers…</p>
        <div className="flex gap-2">
          {QUIZ.map((state, i) => (
            <TestIcon key={i} state={i < n ? state : "idle"} />
          ))}
        </div>
      </Fade>
    </Layer>
  );
}

function LessonLayer({ t }: { t: Clock }) {
  return (
    <Layer>
      <div className="absolute inset-0 overflow-hidden rounded-[14px] border border-ink bg-surface shadow-raised">
        <Settle delay={0.35}>
          <LessonScene t={t} />
        </Settle>
      </div>
    </Layer>
  );
}

function CheckpointScene({ t }: { t: Clock }) {
  const typed = useRamp(t, 1100, 1900);
  const a = useBeat(t, [1400, 1550, 2500, 2650, 2850, 3000, 3150]);
  const verdict: TestState[] = ["fail", "fail", "pass"];
  const tests = [0, 1, 2].map<TestState>((i) =>
    a >= 5 + i ? verdict[i] : a >= 3 ? "running" : "idle",
  );
  return (
    <Layer>
      <LoopsCard tall />
      <Ide
        slideIn
        code={{ text: FIXED, progress: typed }}
        tests={tests}
        output={a >= 5 ? "1 2 3 4" : null}
        checkPressed={a === 3}
      />
      <Cursor {...(a >= 2 ? CURSOR_ON : CURSOR_OFF)} visible={a >= 1} pressed={a === 3} />
    </Layer>
  );
}

function GuruScene({ t }: { t: Clock }) {
  const talk = useRamp(t, 350, 2700);
  const a = useBeat(t, [900, 2500, 3600]);
  return (
    <Layer>
      <LoopsCard tall={false} />
      <GuruPanel progress={talk} rise />
      <Ide
        code={{ text: FIXED, progress: 1 }}
        tests={["fail", "fail", "pass"]}
        output="1 2 3 4"
        bug
        bugVisible={a >= 1}
        tip={a === 2 ? <GroqTip key="tip" text="range(1, 5) starts at 1, not 0" /> : null}
      />
    </Layer>
  );
}

function FixedScene({ t }: { t: Clock }) {
  const typed = useRamp(t, 250, 950);
  const a = useBeat(t, [1000, 1100, 1450, 1600, 1700, 1820, 1940, 2000, 2500, 2650]);
  const tests = [0, 1, 2].map<TestState>((i) =>
    a >= 5 + i ? "pass" : a >= 3 ? "running" : i === 2 ? "pass" : "fail",
  );
  return (
    <Layer>
      <MasteryCard value={a >= 8 ? 85 : 40} status={a >= 9 ? "strong" : "weak"} />
      <GuruPanel progress={1} rise={false} />
      <Ide
        code={{ text: BUGGY, from: FIXED, progress: typed }}
        tests={tests}
        output={a >= 5 ? "0 1 2 3 4" : "1 2 3 4"}
        bug
        bugVisible={false}
        checkPressed={a === 3}
      />
      <Cursor {...(a >= 2 ? CURSOR_ON : CURSOR_OFF)} visible={a >= 1 && a < 7} pressed={a === 3} />
      <AnimatePresence>{a >= 10 && <PlanBanner key="banner" />}</AnimatePresence>
    </Layer>
  );
}

const SCENE_VIEWS = [UploadScene, TopicsScene, LessonLayer, CheckpointScene, GuruScene, FixedScene];
const PROVIDERS = ["Gemini", "Gemini", "Gemini", null, "Claude", "Claude"];

function AppBar({ index }: { index: number }) {
  const provider = PROVIDERS[index];
  return (
    <div className="absolute inset-x-0 top-0 flex h-9 items-center gap-2 border-b border-line bg-surface px-4">
      <BookMark className="size-5 text-ink" />
      <span className="text-[13px] font-semibold text-ink">LearnMate</span>
      <span className="mx-auto font-mono text-xs text-lm-muted">
        python-loops-lists.pdf › Loops
      </span>
      <div className="flex w-[70px] justify-end">
        <AnimatePresence mode="popLayout" initial={false}>
          {provider && (
            <motion.span
              key={provider}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ProviderChip provider={provider} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function BookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn("size-7", className)} fill="none" aria-hidden="true">
      <path
        d="M13 6.5C10.5 4.8 7 4.5 3.5 5v15.5c3.5-.5 7-.2 9.5 1.5V6.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M15 6.5c2.5-1.7 6-2 9.5-1.5v15.5c-3.5-.5-7-.2-9.5 1.5V6.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect
        className="lm-caret-rect"
        x="13"
        y="5"
        width="2"
        height="18"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}

function Segment({
  state,
  t,
  duration,
}: {
  state: "done" | "active" | "todo";
  t: Clock;
  duration: number;
}) {
  const scale = useTransform(t, (v) => Math.min(1, v / duration));
  return (
    <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-line">
      {state === "active" ? (
        <motion.span className="block h-full origin-left bg-ink" style={{ scaleX: scale }} />
      ) : (
        <span
          className="block h-full origin-left bg-ink"
          style={{ transform: `scaleX(${state === "done" ? 1 : 0})` }}
        />
      )}
    </span>
  );
}

/* ---------- the demo ---------- */

function HeroDemo() {
  const reduced = useReduce();
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useInView(ref, { amount: 0.2 });
  const [playing, setPlaying] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const on = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const { index, wrapped, times, goTo } = usePlayhead(
    SCENES,
    playing && onScreen && tabVisible && !reduced,
  );
  const finalClock = useMotionValue<number>(SCENES[SCENES.length - 1].duration);
  const View = SCENE_VIEWS[index];
  const shown = reduced ? SCENES.length - 1 : index;
  void wrapped;

  return (
    <div ref={ref}>
      <p className="lm-sr">
        Product demo: a PDF is uploaded and split into five topics. A Python for-loop lesson plays
        with a variable box counting from 0 to 4. At a checkpoint an IDE opens, a test fails, Guru
        asks a question citing page 6, the code is fixed, all three tests pass and Loops moves from
        weak to strong.
      </p>
      <div aria-hidden="true">
        <ScaledStage width={762} height={442}>
          <BrowserFrame
            url="learnmate.app/learn/loops"
            className="h-[442px] w-[762px]"
            bodyClassName="relative h-[404px] w-[760px] bg-bg"
          >
            <AppBar index={shown} />
            {reduced ? (
              <FixedScene t={finalClock} />
            ) : (
              <AnimatePresence mode="popLayout">
                <View key={index} t={times[index]} />
              </AnimatePresence>
            )}
          </BrowserFrame>
        </ScaledStage>
      </div>
      {!reduced && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" role="group" aria-label="Demo scenes">
            {SCENES.map((sc, i) => (
              <button
                key={sc.id}
                type="button"
                aria-label={`Scene ${i + 1} of ${SCENES.length}: ${sc.label}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => goTo(i)}
                className="relative h-6 flex-1 cursor-pointer rounded-full"
              >
                <Segment
                  state={i < index ? "done" : i === index ? "active" : "todo"}
                  t={times[i]}
                  duration={sc.duration}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={!playing}
            aria-label={playing ? "Pause demo" : "Play demo"}
            onClick={() => setPlaying((p) => !p)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2"
          >
            {playing ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- the hero section ---------- */

const PROOF: { icon: LucideIcon; text: string }[] = [
  { icon: FileText, text: "Every explanation cites its page" },
  { icon: Terminal, text: "Runs Python, JS, React, C++, Java and more" },
  { icon: HelpCircle, text: "Never hands you the answer first" },
];

const HEADLINE = ["Your", "textbook,", "turned", "into", "lessons", "you", "can", "run."];

export function LmHero({
  primaryHref,
  primaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative px-4 pt-6 pb-12 sm:px-6 sm:pt-10 lg:pb-[84px]"
    >
      <div
        aria-hidden="true"
        className="lm-hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px]"
      />
      <div aria-hidden="true" className="lm-dots absolute inset-x-0 top-0 -z-10 h-[760px]" />
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <motion.div
          className="lg:col-span-5"
          variants={stagger(0.08)}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={reveal}
            className="mb-6 inline-flex max-w-full items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-2 shadow-raised"
          >
            Built for Equinox 2026 · Gemini × Claude × Groq
          </motion.p>
          <h1
            id="hero-title"
            className="fall m-0 text-[40px] leading-[1.04] font-semibold tracking-[-0.03em] text-ink sm:text-[56px] xl:text-[64px]"
            data-state="in"
            style={{ "--stagger": "70ms", "--delay": "100ms" } as CSSProperties}
          >
            {HEADLINE.map((word, i) => {
              const bare = word.replace(/[.,]$/, "");
              const tail = word.slice(bare.length);
              const underline = word === "run.";
              return (
                <span key={word} className="mr-[0.24em] inline-block whitespace-nowrap">
                  <span className="relative inline-block">
                    <span
                      className="inline-block overflow-hidden align-bottom"
                      style={{ paddingBottom: "0.14em", marginBottom: "-0.14em" }}
                    >
                      <span className="fall-word" style={{ "--i": i } as CSSProperties}>
                        {bare}
                      </span>
                    </span>
                    {underline && (
                      <svg
                        className="pointer-events-none absolute -bottom-[0.14em] left-0 h-[0.2em] w-full overflow-visible"
                        viewBox="0 0 100 12"
                        preserveAspectRatio="none"
                        fill="none"
                        aria-hidden="true"
                      >
                        <motion.path
                          d="M2 8 C 22 2, 38 11, 56 6 S 86 3, 98 7"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
                        />
                      </svg>
                    )}
                  </span>
                  {tail}
                </span>
              );
            })}
          </h1>
          <motion.p
            variants={reveal}
            className="mt-6 mb-0 max-w-[34rem] text-[17px] leading-[1.6] text-ink-2 sm:text-lg"
          >
            Upload a PDF. LearnMate turns it into animated explainer videos, hands-on coding
            exercises in a real IDE, and Guru, a tutor who teaches by asking the right question.
          </motion.p>
          <motion.div variants={reveal} className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-bg shadow-raised transition-transform hover:-translate-y-0.5"
            >
              {primaryLabel}
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-surface px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-ink/50"
            >
              <Play size={14} aria-hidden="true" className="fill-ink" />
              Watch how it works
            </a>
          </motion.div>
          <motion.ul variants={reveal} className="m-0 mt-8 flex list-none flex-col gap-2.5 p-0">
            {PROOF.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-lm-muted">
                <Icon size={16} aria-hidden="true" className="shrink-0 text-ink" />
                {text}
              </li>
            ))}
          </motion.ul>
        </motion.div>
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
        >
          <HeroDemo />
        </motion.div>
      </div>
    </section>
  );
}
