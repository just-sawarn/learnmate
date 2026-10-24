"use client";

import {
  AnimatePresence,
  animate,
  motion,
  motionValue,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Asterisk, Database, FileText, Lock, Sparkles, Zap, type LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/*
 * Primitives for the landing page's hero and feature demos. All data is illustrative, all motion is
 * driven by a single clock per demo, and nothing here talks to the backend.
 */

export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring", stiffness: 260, damping: 30 } as const;

export const reveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
export const stagger = (gap = 0.07, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});
export const inView = { once: true, margin: "-15%" } as const;

const REDUCED = "(prefers-reduced-motion: reduce)";

/** Server-safe reduced-motion flag: false while hydrating, then the visitor's real preference. */
export function useReduce(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(REDUCED);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/* ---------- time helpers ---------- */

/** React state derived from a motion value; re-renders only when the derived value changes. */
export function useDerived<T>(mv: MotionValue<number>, fn: (v: number) => T): T {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  const [value, setValue] = useState<T>(() => fn(mv.get()));
  useEffect(() => setValue(ref.current(mv.get())), [mv]);
  useMotionValueEvent(mv, "change", (v) => setValue(ref.current(v)));
  return value;
}

/** How many of the thresholds the clock has passed. */
export function useBeat(mv: MotionValue<number>, thresholds: number[]) {
  return useDerived(mv, (v) => thresholds.filter((t) => v >= t).length);
}

/** A motion value that ramps from `from` to `to` between two clock times. */
export function useRamp(mv: MotionValue<number>, t0: number, t1: number, from = 0, to = 1) {
  const at = (v: number) => from + (to - from) * Math.min(1, Math.max(0, (v - t0) / (t1 - t0)));
  const out = useMotionValue(at(mv.get()));
  // Written from an effect and an event, never during render: a render-time update would notify
  // subscribers (like CodeTyper) while another component is still rendering.
  useEffect(() => {
    out.set(at(mv.get()));
    return mv.on("change", (v) => out.set(at(v)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mv, out, t0, t1, from, to]);
  return out;
}

interface ProgressOptions {
  progress?: number | MotionValue<number>;
  play?: boolean;
  duration?: number;
  delay?: number;
  repeat?: boolean;
  repeatDelay?: number;
}

/** A 0..1 motion value driven by a prop, or by its own timeline when `play` is set. */
export function useProgress({
  progress,
  play = false,
  duration = 1500,
  delay = 0,
  repeat = false,
  repeatDelay = 0,
}: ProgressOptions) {
  const own = useMotionValue(typeof progress === "number" ? progress : 0);
  const reduced = useReduce();
  useEffect(() => {
    if (typeof progress === "number") own.set(progress);
  }, [progress, own]);
  useEffect(() => {
    if (progress !== undefined) return;
    if (reduced) {
      own.set(1);
      return;
    }
    if (!play) return;
    own.set(0);
    const controls = animate(own, 1, {
      duration: duration / 1000,
      delay: delay / 1000,
      ease: "linear",
      repeat: repeat ? Infinity : 0,
      repeatDelay: repeatDelay / 1000,
    });
    return () => controls.stop();
  }, [progress, play, duration, delay, repeat, repeatDelay, reduced, own]);
  return typeof progress === "object" ? progress : own;
}

/* ---------- fixed-size stage that scales to its container ---------- */

export function ScaledStage({
  width,
  height,
  children,
  className,
}: {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = useMotionValue(1);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      scale.set(el.clientWidth / width);
      setReady(true);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale, width]);
  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}` }}
    >
      <motion.div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          scale,
          originX: 0,
          originY: 0,
          opacity: ready ? 1 : 0,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ---------- surfaces ---------- */

export function BrowserFrame({
  url,
  children,
  className,
  bodyClassName,
}: {
  url: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-line bg-surface shadow-raised",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-3 border-b border-line bg-surface-2 px-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full border border-ink/30 bg-surface" />
          ))}
        </div>
        <div className="mx-auto flex h-6 w-[44%] items-center justify-center gap-1.5 rounded-full border border-line bg-surface font-mono text-xs text-lm-muted">
          <Lock size={10} aria-hidden="true" />
          {url}
        </div>
        <div className="w-[42px]" />
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  Gemini: Sparkles,
  Claude: Asterisk,
  Groq: Zap,
  Supabase: Database,
};

export function ProviderChip({
  provider,
  solid = false,
  className,
}: {
  provider: string;
  solid?: boolean;
  className?: string;
}) {
  const Icon = PROVIDER_ICONS[provider] ?? Sparkles;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        solid ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2",
        className,
      )}
    >
      <Icon size={11} strokeWidth={2.2} aria-hidden="true" />
      {provider}
    </span>
  );
}

export function PageChip({ page, className }: { page: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-xs whitespace-nowrap text-lm-muted",
        className,
      )}
    >
      <FileText size={11} aria-hidden="true" />
      p. {page}
    </span>
  );
}

export function PdfIcon({ name, className }: { name?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative h-[84px] w-16 rounded-[8px] border border-ink bg-surface shadow-raised">
        <span className="absolute top-0 right-0 size-4 rounded-bl-[6px] border-b border-l border-ink bg-surface-2" />
        <span className="absolute bottom-2 left-2 rounded bg-ink px-1.5 py-px font-mono text-xs font-semibold text-bg">
          PDF
        </span>
        <span className="absolute top-5 left-2 h-1 w-9 rounded-full bg-line" />
        <span className="absolute top-8 left-2 h-1 w-7 rounded-full bg-line" />
        <span className="absolute top-11 left-2 h-1 w-10 rounded-full bg-line" />
      </div>
      {name && <span className="font-mono text-xs whitespace-nowrap text-ink-2">{name}</span>}
    </div>
  );
}

export function Cursor({
  x,
  y,
  pressed = false,
  visible = true,
}: {
  x: number;
  y: number;
  pressed?: boolean;
  visible?: boolean;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-0 z-30"
      initial={false}
      animate={{ x, y, opacity: visible ? 1 : 0 }}
      transition={{
        x: { type: "spring", stiffness: 120, damping: 20 },
        y: { type: "spring", stiffness: 120, damping: 20 },
        opacity: { duration: 0.2 },
      }}
    >
      <motion.span
        className="absolute -top-3 -left-3 size-6 rounded-full border border-ink"
        initial={false}
        animate={pressed ? { scale: [0.4, 1.6], opacity: [0.5, 0] } : { scale: 0.4, opacity: 0 }}
        transition={{ duration: 0.45 }}
      />
      <motion.svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        initial={false}
        animate={{ scale: pressed ? 0.82 : 1 }}
        transition={{ duration: 0.12 }}
        style={{ originX: 0, originY: 0 }}
      >
        <path
          d="M3 2v15l4.2-3.6 2.8 6 2.6-1.2-2.8-5.8 5.6-.2L3 2z"
          fill="var(--lm-ink)"
          stroke="var(--lm-bg)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
}

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-lm-muted"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: 0.14 * i }}
        />
      ))}
    </span>
  );
}

/** Words fade in one by one as `progress` moves from 0 to 1. */
export function GuruBubble({
  text,
  progress,
  play,
  duration = 2400,
  delay,
  badge = true,
  className,
}: {
  text: string;
  progress?: number | MotionValue<number>;
  play?: boolean;
  duration?: number;
  delay?: number;
  badge?: boolean;
  className?: string;
}) {
  const mv = useProgress({ progress, play, duration, delay });
  const words = text.split(" ");
  const shown = useDerived(mv, (v) => Math.round(Math.min(1, Math.max(0, v)) * words.length));
  return (
    <div
      className={cn("rounded-[14px] border border-line bg-surface p-3 shadow-raised", className)}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-bg">
          G
        </span>
        <span className="text-xs font-semibold text-ink">Guru</span>
        {badge && <ProviderChip provider="Claude" className="ml-auto" />}
      </div>
      <p className="relative m-0 text-[13px] leading-[1.5] text-ink-2">
        <span className="invisible">{text}</span>
        <span className="absolute inset-0">
          {words.slice(0, shown).map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {w}{" "}
            </motion.span>
          ))}
        </span>
      </p>
    </div>
  );
}

export function Meter({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const reduced = useReduce();
  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1, ease: EASE });
    return () => controls.stop();
  }, [value, mv, reduced]);
  const scale = useTransform(mv, (v) => Math.min(1, Math.max(0, v / 100)));
  const label2 = useDerived(mv, (v) => Math.round(v));
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-mono text-ink-2 tabular-nums">{label2}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full origin-left rounded-full bg-ink" style={{ scaleX: scale }} />
      </div>
    </div>
  );
}

/* ---------- tests ---------- */

export type TestState = "idle" | "running" | "pass" | "fail";

export function TestIcon({ state }: { state: TestState }) {
  return (
    <span className="relative inline-block size-[18px]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.svg
          key={state}
          viewBox="0 0 18 18"
          className="absolute inset-0 size-[18px]"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={SPRING}
          fill="none"
        >
          {state === "pass" && (
            <>
              <circle cx="9" cy="9" r="8.5" fill="var(--lm-ink)" />
              <motion.path
                d="M5.2 9.3 7.8 11.9 12.8 6.4"
                stroke="var(--lm-bg)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.08 }}
              />
            </>
          )}
          {state === "fail" && (
            <>
              <circle cx="9" cy="9" r="7.8" stroke="var(--lm-ink)" strokeWidth="1.6" />
              <path
                d="M6.2 6.2 11.8 11.8M11.8 6.2 6.2 11.8"
                stroke="var(--lm-ink)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </>
          )}
          {state === "idle" && (
            <circle
              cx="9"
              cy="9"
              r="7.8"
              stroke="var(--lm-muted)"
              strokeWidth="1.4"
              strokeDasharray="2.5 2.5"
            />
          )}
          {state === "running" && (
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
              style={{ originX: "9px", originY: "9px" }}
            >
              <circle cx="9" cy="9" r="7.8" stroke="var(--lm-line)" strokeWidth="1.6" />
              <path
                d="M9 1.2a7.8 7.8 0 0 1 7.8 7.8"
                stroke="var(--lm-ink)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </motion.g>
          )}
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}

const TEST_WORD: Record<TestState, string> = {
  idle: "hidden",
  running: "running",
  pass: "passed",
  fail: "failed",
};

export function TestRow({
  label,
  state,
  className,
}: {
  label: string;
  state: TestState;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[10px] border bg-surface px-3 py-[5px]",
        state === "fail" ? "border-ink" : "border-line",
        className,
      )}
    >
      <TestIcon state={state} />
      <span className="font-mono text-xs text-ink-2">{label}</span>
      <span className="ml-auto font-mono text-xs text-lm-muted">{TEST_WORD[state]}</span>
    </div>
  );
}

export type Mastery = "weak" | "okay" | "strong";

const PILL: Record<Mastery, string> = {
  weak: "border-ink bg-transparent text-ink",
  okay: "border-lm-muted bg-surface-2 text-ink-2",
  strong: "border-ink bg-ink text-bg",
};

export function StatusPill({ status, className }: { status: Mastery; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-[background-color,color,border-color] duration-300",
        PILL[status],
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ y: 7, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -7, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {status}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ---------- code ---------- */

const KEYWORDS = new Set([
  "for",
  "in",
  "if",
  "else",
  "while",
  "def",
  "return",
  "class",
  "import",
  "from",
  "const",
  "let",
  "var",
  "function",
  "public",
  "static",
  "void",
  "int",
  "new",
  "include",
  "using",
  "namespace",
  "System",
]);
const TOKEN =
  /(\/\/.*|#(?!include).*)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_#][\w]*)|(\s+)|(.)/g;
const KIND_CLASS = {
  kw: "font-semibold text-ink",
  str: "text-ink-2",
  num: "text-ink-2",
  com: "text-lm-muted italic",
  fn: "text-ink underline decoration-lm-muted/60 underline-offset-[3px]",
  plain: "text-ink-2",
} as const;

type Kind = keyof typeof KIND_CLASS;

function tokenize(line: string, lang: string) {
  const out: { text: string; kind: Kind }[] = [];
  for (const m of line.matchAll(TOKEN)) {
    const [text, comment, str, num, word] = m;
    if (comment && (lang === "python" ? comment.startsWith("#") : comment.startsWith("//")))
      out.push({ text, kind: "com" });
    else if (str) out.push({ text, kind: "str" });
    else if (num) out.push({ text, kind: "num" });
    else if (word) {
      const next = line[(m.index ?? 0) + text.length];
      if (KEYWORDS.has(word.replace("#", ""))) out.push({ text, kind: "kw" });
      else if (next === "(") out.push({ text, kind: "fn" });
      else out.push({ text, kind: "plain" });
    } else out.push({ text, kind: "plain" });
  }
  return out;
}

/** How many characters change between two snippets. */
function diffSize(from: string | undefined, to: string) {
  if (from === undefined) return to.length;
  let head = 0;
  while (head < from.length && head < to.length && from[head] === to[head]) head++;
  let tail = 0;
  while (
    tail < from.length - head &&
    tail < to.length - head &&
    from[from.length - 1 - tail] === to[to.length - 1 - tail]
  )
    tail++;
  return from.length - head - tail + (to.length - head - tail);
}

/** The text at step `n` of a type-over: delete the old middle, then type the new one. */
function typeOver(from: string | undefined, to: string, n: number) {
  if (from === undefined) return { value: to.slice(0, n), caret: n };
  let head = 0;
  while (head < from.length && head < to.length && from[head] === to[head]) head++;
  let tail = 0;
  while (
    tail < from.length - head &&
    tail < to.length - head &&
    from[from.length - 1 - tail] === to[to.length - 1 - tail]
  )
    tail++;
  const oldMid = from.slice(head, from.length - tail);
  const newMid = to.slice(head, to.length - tail);
  const before = from.slice(0, head);
  const after = from.slice(from.length - tail);
  if (n <= oldMid.length) {
    const keep = oldMid.length - n;
    return { value: before + oldMid.slice(0, keep) + after, caret: head + keep };
  }
  const typed = n - oldMid.length;
  return { value: before + newMid.slice(0, typed) + after, caret: head + typed };
}

export function CodeTyper({
  text,
  from,
  lang = "python",
  progress,
  play,
  duration,
  delay,
  repeat,
  repeatDelay,
  caret = true,
  lineNumbers = false,
  className,
}: {
  text: string;
  from?: string;
  lang?: string;
  progress?: number | MotionValue<number>;
  play?: boolean;
  duration?: number;
  delay?: number;
  repeat?: boolean;
  repeatDelay?: number;
  caret?: boolean;
  lineNumbers?: boolean;
  className?: string;
}) {
  const mv = useProgress({ progress, play, duration, delay, repeat, repeatDelay });
  const total = diffSize(from, text);
  const n = useDerived(mv, (v) => Math.round(Math.min(1, Math.max(0, v)) * total));
  const { value, caret: at } = typeOver(from, text, n);
  const done = n >= total;
  const lines = value.split("\n");
  const rows = Math.max(text.split("\n").length, (from ?? "").split("\n").length);
  const starts = lines.reduce<number[]>(
    (acc, _l, i) => [...acc, i === 0 ? 0 : acc[i - 1] + lines[i - 1].length + 1],
    [],
  );

  return (
    <pre
      className={cn("m-0 font-mono text-[13px] whitespace-pre", className)}
      style={{ lineHeight: "22px", minHeight: 22 * rows }}
    >
      {lines.map((line, i) => {
        const start = starts[i];
        const here =
          caret &&
          !(done && from !== undefined) &&
          !(done && n === 0) &&
          at >= start &&
          at <= start + line.length;
        const cut = here ? at - start : null;
        const parts: ReactNode[] = [];
        let pos = 0;
        let placed = false;
        const mark = <span key="caret" className="lm-caret" aria-hidden="true" />;
        tokenize(line, lang).forEach((tok, t) => {
          const end = pos + tok.text.length;
          if (cut !== null && !placed && cut > pos && cut < end) {
            const k = cut - pos;
            parts.push(
              <span key={`${t}a`} className={KIND_CLASS[tok.kind]}>
                {tok.text.slice(0, k)}
              </span>,
              mark,
              <span key={`${t}b`} className={KIND_CLASS[tok.kind]}>
                {tok.text.slice(k)}
              </span>,
            );
            placed = true;
          } else {
            if (cut !== null && !placed && cut === pos) {
              parts.push(mark);
              placed = true;
            }
            parts.push(
              <span key={t} className={KIND_CLASS[tok.kind]}>
                {tok.text}
              </span>,
            );
          }
          pos = end;
        });
        if (cut !== null && !placed) parts.push(mark);
        return (
          <div key={i} className="flex">
            {lineNumbers && (
              <span className="mr-3 inline-block w-4 shrink-0 text-right text-lm-muted select-none">
                {i + 1}
              </span>
            )}
            <span>{parts}</span>
          </div>
        );
      })}
    </pre>
  );
}

export function VariableBox({
  name,
  value,
  className,
}: {
  name: string;
  value: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-[12px] border border-ink bg-surface",
        className,
      )}
    >
      <div className="flex items-center bg-ink px-3 font-mono text-[13px] font-semibold text-bg">
        {name}
      </div>
      <div
        className="relative flex h-11 min-w-16 flex-1 items-center justify-center overflow-hidden px-3 font-mono text-xl font-semibold text-ink"
        style={{ perspective: 200 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(value)}
            initial={{ y: 18, opacity: 0, rotateX: -70 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: -18, opacity: 0, rotateX: 70 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {value ?? "–"}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CaptionTyper({
  text,
  progress,
  play,
  duration = 2000,
  delay,
  className,
}: {
  text: string;
  progress?: number | MotionValue<number>;
  play?: boolean;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const mv = useProgress({ progress, play, duration, delay });
  const n = useDerived(mv, (v) => Math.round(Math.min(1, Math.max(0, v)) * text.length));
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="invisible">{text}</span>
      <span className="absolute inset-0">
        {text.slice(0, n)}
        {n > 0 && n < text.length && <span className="lm-caret" aria-hidden="true" />}
      </span>
    </span>
  );
}

/**
 * One clock per demo: `times[i]` counts milliseconds inside scene i, and only the active scene's clock
 * ticks, on a single rAF loop that runs only while `running` (on screen, visible tab, not paused).
 */
export function usePlayhead(scenes: readonly { duration: number }[], running: boolean) {
  const times = useMemo(() => scenes.map(() => motionValue(0)), [scenes]);
  const [index, setIndex] = useState(0);
  const [wrapped, setWrapped] = useState(false);
  const current = useRef(0);

  const goTo = useCallback(
    (i: number) => {
      times[i].set(0);
      setWrapped(i <= current.current);
      current.current = i;
      setIndex(i);
    },
    [times],
  );

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const i = current.current;
      const next = times[i].get() + dt;
      if (next >= scenes[i].duration) {
        times[i].set(scenes[i].duration);
        goTo((i + 1) % scenes.length);
      } else times[i].set(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, scenes, times, goTo]);

  return { index, wrapped, times, goTo };
}
