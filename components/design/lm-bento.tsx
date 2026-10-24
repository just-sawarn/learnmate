"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { Check, Lock, LockOpen } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  CodeTyper,
  EASE,
  PageChip,
  ScaledStage,
  SPRING,
  StatusPill,
  VariableBox,
  inView,
  reveal,
  stagger,
  type Mastery,
  useReduce,
} from "@/components/design/lm-kit";
import { cn } from "@/lib/utils";

/*
 * The features grid: ten tiles, each with a small looping demo that runs only while its tile is on
 * screen (and a little faster on hover). Illustrative content; no network, no AI.
 */

interface TileProps {
  active: boolean;
  fast: boolean;
}

/** A tick counter that only runs while the tile is visible. Reduced motion shows the end state. */
function useTicker(active: boolean, ms: number, count: number, still = count - 1) {
  const reduced = useReduce();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active || reduced) return;
    const id = setInterval(() => setN((v) => (v + 1) % count), ms);
    return () => clearInterval(id);
  }, [active, reduced, ms, count]);
  return reduced ? still : n;
}

const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: EASE },
};

function Tile({
  title,
  body,
  className,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children: (state: TileProps) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const active = useInView(ref, { margin: "100px" });
  const [fast, setFast] = useState(false);
  return (
    <motion.article
      ref={ref}
      variants={reveal}
      whileHover={{ y: -3 }}
      transition={SPRING}
      onHoverStart={() => setFast(true)}
      onHoverEnd={() => setFast(false)}
      className={cn(
        "flex flex-col rounded-[24px] border border-line bg-surface p-5 shadow-raised transition-colors duration-200 hover:border-ink/35",
        className,
      )}
    >
      <div aria-hidden="true" className="relative mb-5 overflow-hidden rounded-[14px] bg-surface-2">
        {children({ active, fast })}
      </div>
      <h3 className="m-0 text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-1.5 mb-0 text-[15px] leading-[1.55] text-ink-2">{body}</p>
    </motion.article>
  );
}

/* ---------- visuals ---------- */

function CountingBox({ active }: { active: boolean }) {
  const n = useTicker(active, 520, 5);
  return <VariableBox name="i" value={n} className="w-48" />;
}

function LessonVisual({ active, fast }: TileProps) {
  const step = useTicker(active, fast ? 1800 : 2800, 3);
  const captions = ["range(5) gives five numbers", "i ticks from 0 to 4", "the loop repeats"];
  return (
    <ScaledStage width={520} height={290}>
      <div className="absolute inset-4 flex flex-col overflow-hidden rounded-[12px] border border-line bg-surface">
        <div className="flex h-8 items-center justify-between border-b border-line px-3 text-xs font-semibold text-ink">
          Loops <PageChip page={6} />
        </div>
        <div className="relative flex-1">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="code" className="absolute inset-0 p-5" {...swap}>
                <div className="rounded-[10px] bg-surface-2 p-4">
                  <CodeTyper
                    text={"for i in range(5):\n    print(i)"}
                    play={active}
                    duration={1500}
                  />
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="var"
                className="absolute inset-0 flex items-center justify-center gap-4"
                {...swap}
              >
                <span className="font-mono text-sm text-ink-2">print(i) →</span>
                <CountingBox active={active} />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="flow"
                className="absolute inset-0 flex items-center justify-center"
                {...swap}
              >
                <div className="relative h-[110px] w-[260px]">
                  {["start", "i in range(5)?", "print(i)"].map((label, i) => (
                    <span
                      key={label}
                      className="absolute left-[60px] flex h-7 w-[140px] items-center justify-center rounded-lg border border-ink bg-surface font-mono text-xs text-ink"
                      style={{ top: 40 * i }}
                    >
                      {label}
                    </span>
                  ))}
                  <motion.span
                    className="absolute top-0 left-0 size-3 rounded-full bg-ink"
                    animate={{ x: [124, 124, 124, 230, 230, 124], y: [10, 50, 90, 90, 50, 50] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex h-9 items-center gap-3 border-t border-line px-3">
          <span className="font-mono text-xs text-ink-2">{captions[step]}</span>
          <div className="ml-auto h-1 w-28 rounded-full bg-line">
            <motion.div
              className="h-full origin-left rounded-full bg-ink"
              animate={{ scaleX: (step + 1) / 3 }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>
        </div>
      </div>
    </ScaledStage>
  );
}

const LANGS = [
  { name: "Python", code: 'print("hello")', out: "hello" },
  { name: "JavaScript", code: 'console.log("hello");', out: "hello" },
  { name: "C++", code: 'std::cout << "hello";', out: "hello" },
  { name: "Java", code: 'System.out.println("hello");', out: "hello" },
  { name: "React", code: "<h1>hello</h1>", out: "hello (rendered)" },
];

function IdeVisual({ active, fast }: TileProps) {
  const i = useTicker(active, fast ? 1400 : 2200, LANGS.length, 0);
  const lang = LANGS[i];
  return (
    <ScaledStage width={520} height={290}>
      <div className="absolute inset-4 flex flex-col overflow-hidden rounded-[12px] border border-line bg-surface">
        <div className="flex h-9 items-center gap-1 border-b border-line px-2">
          {LANGS.map((l, t) => (
            <span
              key={l.name}
              className="relative rounded-md px-2.5 py-1 text-xs font-medium text-ink-2"
            >
              {t === i && (
                <motion.span
                  layoutId="ide-tab"
                  className="absolute inset-0 rounded-md bg-ink"
                  transition={SPRING}
                />
              )}
              <span className={cn("relative", t === i && "text-bg")}>{l.name}</span>
            </span>
          ))}
        </div>
        <div className="relative m-3 flex-1 rounded-[10px] bg-surface-2 p-4">
          <AnimatePresence mode="wait">
            <motion.div key={lang.name} {...swap}>
              <CodeTyper
                text={lang.code}
                lang={lang.name === "Python" ? "python" : "js"}
                progress={1}
                caret={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mx-3 mb-3 h-[58px] rounded-[10px] bg-ink px-3 py-2 font-mono text-[13px] text-bg">
          <div className="text-bg/60">$ run</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={lang.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.25 }}
            >
              {lang.out}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ScaledStage>
  );
}

const RUNGS = ["Ask a guiding question", "Name the concept (p. 6)", "Show a partial fix"];

function GuruVisual({ active, fast }: TileProps) {
  const s = useTicker(active, fast ? 900 : 1500, 4, 2);
  const open = s >= 3;
  return (
    <div className="flex h-[210px] flex-col justify-center gap-2 px-5">
      {RUNGS.map((label, i) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[13px] transition-colors duration-300",
            s === i ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2",
          )}
        >
          <span className="flex size-5 items-center justify-center rounded-full border border-current font-mono text-xs">
            {i + 1}
          </span>
          {label}
        </div>
      ))}
      <div className="flex items-center gap-2 pl-1 text-[13px] text-ink-2">
        {open ? <LockOpen size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
        Full solution {open ? "unlocked" : "locked until asked twice"}
      </div>
    </div>
  );
}

function CiteVisual({ active, fast }: TileProps) {
  const s = useTicker(active, fast ? 1000 : 1700, 4, 1);
  return (
    <div className="flex h-[210px] items-center gap-4 px-5">
      <p className="m-0 flex-1 text-[13px] leading-[1.55] text-ink-2">
        range stops before the end value, like a fence with posts numbered from 0.{" "}
        <PageChip page={6} className="align-middle" />
      </p>
      <div className="w-[88px] shrink-0 rounded-[8px] border border-ink bg-surface p-2">
        <p className="m-0 mb-1.5 font-mono text-xs text-lm-muted">p. 6</p>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "mb-1.5 h-2 rounded-full transition-colors duration-300",
              i === s ? "bg-ink" : "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function HonestVisual({ active }: TileProps) {
  const [show, setShow] = useState(false);
  const reduced = useReduce();
  useEffect(() => {
    if (reduced || !active) return;
    const id = setInterval(() => setShow((v) => !v), 2200);
    return () => clearInterval(id);
  }, [active, reduced]);
  return (
    <div className="flex h-[210px] flex-col justify-center gap-2.5 px-5">
      <div className="self-end rounded-[12px] bg-ink px-3 py-1.5 text-[13px] text-bg">
        How do I use pandas?
      </div>
      <AnimatePresence mode="wait">
        {(show || reduced) && (
          <motion.div
            key="reply"
            className="rounded-[12px] border border-line bg-surface p-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span className="mb-1.5 inline-block rounded-full bg-[var(--lm-amber-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--lm-amber-ink)]">
              Beyond your uploaded material
            </span>
            <p className="m-0 text-[13px] text-ink-2">
              That isn&apos;t in your PDF, but here&apos;s the idea…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CHOICES = ["A  range(5)", "B  range(1, 5)", "C  range(0, 4)"];
const TOPIC_ROWS: { name: string; status: Mastery }[] = [
  { name: "Variables", status: "strong" },
  { name: "Lists", status: "okay" },
  { name: "Loops", status: "weak" },
];

function QuizVisual({ active, fast }: TileProps) {
  const s = useTicker(active, fast ? 700 : 1100, 6, 5);
  const rows = s >= 4 ? [TOPIC_ROWS[2], TOPIC_ROWS[1], TOPIC_ROWS[0]] : TOPIC_ROWS;
  return (
    <div className="grid h-[210px] grid-cols-2 gap-3 p-4">
      <div className="flex flex-col justify-center gap-1.5">
        {CHOICES.map((c, i) => (
          <div
            key={c}
            className={cn(
              "flex items-center justify-between rounded-lg border px-2.5 py-1.5 font-mono text-xs",
              s > i && s <= 3
                ? "border-ink bg-surface text-ink"
                : "border-line bg-surface text-ink-2",
            )}
          >
            {c}
            {s > i && i === 0 && <Check size={12} aria-hidden="true" />}
          </div>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col justify-center gap-1.5 p-0">
        {rows.map((r) => (
          <motion.li
            key={r.name}
            layout
            transition={SPRING}
            className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 text-xs font-medium text-ink"
          >
            {r.name}
            <StatusPill status={r.status} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function PlanVisual({ active, fast }: TileProps) {
  const flipped = useTicker(active, fast ? 1300 : 2200, 2, 1) === 1;
  const face =
    "absolute inset-0 flex flex-col justify-center gap-1.5 rounded-[14px] border border-ink bg-surface p-4 [backface-visibility:hidden]";
  return (
    <div className="flex h-[210px] items-center justify-center" style={{ perspective: 800 }}>
      <motion.div
        className="relative h-[130px] w-[220px]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className={face}>
          <span className="text-xs font-semibold tracking-wide text-lm-muted uppercase">
            Plan v1
          </span>
          <span className="text-[13px] text-ink">1 · Loops 2 · Lists 3 · Functions</span>
        </div>
        <div className={cn(face, "[transform:rotateY(180deg)]")}>
          <span className="text-xs font-semibold tracking-wide text-lm-muted uppercase">
            Plan v2
          </span>
          <span className="text-[13px] text-ink">1 · Lists 2 · Functions</span>
          <span className="text-xs text-ink-2">Loops moved to strong.</span>
        </div>
      </motion.div>
    </div>
  );
}

function ProgressVisual({ active }: TileProps) {
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setRun((v) => v + 1), 3600);
    return () => clearInterval(id);
  }, [active]);
  const points: [number, number][] = [
    [30, 120],
    [150, 80],
    [270, 32],
  ];
  return (
    <div className="flex h-[210px] items-center justify-center">
      <svg key={run} viewBox="0 0 300 170" className="w-[88%]" fill="none">
        <path d="M20 140H290M20 20V140" stroke="var(--lm-line)" strokeWidth="1.5" />
        <motion.path
          d="M30 120 L150 80 L270 32"
          stroke="var(--lm-ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        {points.map(([x, y], i) => (
          <g key={i}>
            <motion.circle
              cx={x}
              cy={y}
              r="5"
              fill="var(--lm-ink)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + 0.55 * i }}
            />
            <text x={x} y="158" textAnchor="middle" fontSize="12" fill="var(--lm-muted)">
              Attempt {i + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TipsVisual({ active }: TileProps) {
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setRun((v) => v + 1), 4600);
    return () => clearInterval(id);
  }, [active]);
  return (
    <div className="flex h-[210px] flex-col justify-center gap-3 px-6">
      <div className="rounded-[10px] bg-surface p-3">
        <CodeTyper key={run} text="for i in range(1, 5):" play={active} duration={1600} />
      </div>
      <motion.div
        key={run}
        className="flex items-center gap-2 self-start rounded-full border border-ink bg-surface px-3 py-1 text-xs text-ink"
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.9, ...SPRING }}
      >
        <span className="font-semibold">Groq</span> starts at 1, not 0
        <span className="font-mono text-lm-muted">0.4s</span>
      </motion.div>
    </div>
  );
}

function HindiVisual({ active, fast }: TileProps) {
  const hindi = useTicker(active, fast ? 1300 : 2200, 2, 0) === 1;
  return (
    <div className="flex h-[210px] flex-col justify-center gap-4 px-6">
      <div className="flex items-center gap-3">
        <div className="relative flex rounded-full border border-line bg-surface p-0.5 text-xs font-semibold">
          <motion.span
            className="absolute inset-y-0.5 w-[44px] rounded-full bg-ink"
            animate={{ x: hindi ? 44 : 0 }}
            transition={SPRING}
          />
          <span
            className={cn("relative w-[44px] py-1 text-center", hindi ? "text-ink-2" : "text-bg")}
          >
            EN
          </span>
          <span
            className={cn("relative w-[44px] py-1 text-center", hindi ? "text-bg" : "text-ink-2")}
          >
            हिं
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={String(hindi)}
            className="text-[15px] text-ink"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {hindi ? "range(5) में पाँच संख्याएँ मिलती हैं" : "range(5) gives you five numbers"}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex h-10 items-center gap-1">
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className={cn("lm-bar h-full w-1 rounded-full bg-ink", active && "lm-bar-on")}
            style={
              {
                "--peak": 0.4 + ((37 * i) % 60) / 100,
                animationDuration: `${0.9 + (i % 5) * 0.12}s`,
                animationDelay: `${0.04 * i}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- the grid ---------- */

const TILES: {
  id: string;
  title: string;
  body: string;
  span: string;
  visual: (s: TileProps) => ReactNode;
}[] = [
  {
    id: "lessons",
    title: "Animated explainer lessons",
    body: "Code types itself in, variables update, a token walks the flowchart. Narrated, captioned, sourced.",
    span: "md:col-span-6 md:row-span-2 lg:col-span-6",
    visual: (s) => <LessonVisual {...s} />,
  },
  {
    id: "ide",
    title: "Run real code beside the lesson",
    body: "A side-along IDE with Run and Check (hidden tests) in eight languages.",
    span: "md:col-span-6 md:row-span-2 lg:col-span-6",
    visual: (s) => <IdeVisual {...s} />,
  },
  {
    id: "guru",
    title: "Guru teaches, doesn't tell",
    body: "Three rungs of hints. The solution stays locked until you've asked twice.",
    span: "md:col-span-3 lg:col-span-4",
    visual: (s) => <GuruVisual {...s} />,
  },
  {
    id: "cites",
    title: "Every answer cites its page",
    body: "Explanations point back to the exact page of your material.",
    span: "md:col-span-3 lg:col-span-4",
    visual: (s) => <CiteVisual {...s} />,
  },
  {
    id: "honest",
    title: "Honest when it doesn't know",
    body: "Anything outside your upload is clearly labelled.",
    span: "md:col-span-3 lg:col-span-4",
    visual: (s) => <HonestVisual {...s} />,
  },
  {
    id: "quiz",
    title: "Diagnostic quiz, weak topics found",
    body: "A short quiz sorts your topics from weakest to strongest.",
    span: "md:col-span-3 lg:col-span-4",
    visual: (s) => <QuizVisual {...s} />,
  },
  {
    id: "plan",
    title: "A plan that adapts",
    body: "Your revision plan updates from v1 to v2 as mastery changes.",
    span: "md:col-span-3 lg:col-span-4",
    visual: (s) => <PlanVisual {...s} />,
  },
  {
    id: "progress",
    title: "Progress across attempts",
    body: "Every attempt is saved, so you can see yourself improve.",
    span: "md:col-span-3 lg:col-span-4",
    visual: (s) => <ProgressVisual {...s} />,
  },
  {
    id: "tips",
    title: "Instant tips while you type",
    body: "Quick Groq tips in under two seconds, plus plain-English error translations.",
    span: "md:col-span-6 lg:col-span-6",
    visual: (s) => <TipsVisual {...s} />,
  },
  {
    id: "hindi",
    title: "Hindi and spoken summaries",
    body: "Switch captions to Hindi and listen to a spoken summary.",
    span: "md:col-span-6 lg:col-span-6",
    visual: (s) => <HindiVisual {...s} />,
  },
];

export function BentoGrid() {
  return (
    <motion.div
      variants={stagger(0.07)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      className="grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12 [grid-auto-flow:dense]"
    >
      {TILES.map((t) => (
        <Tile key={t.id} title={t.title} body={t.body} className={t.span}>
          {t.visual}
        </Tile>
      ))}
    </motion.div>
  );
}
