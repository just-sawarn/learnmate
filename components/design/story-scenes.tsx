import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Check, FileText, Play, Sparkles, Upload, X } from "lucide-react";
import {
  Bar,
  Chip,
  clamp,
  Code,
  ease,
  Heading,
  lerp,
  seg,
  Shell,
  tint,
} from "@/components/design/scene-kit";
import { cn } from "@/lib/utils";
import { MapScene, LoopScene, WebScene } from "@/components/design/teaching-scenes";
import type { Subject } from "@/components/design/teaching-data";

/*
 * Presentational scenes for the landing page. Each is a pure function of `p` (0..1 progress inside
 * its stage): no timers, no fetching, no AI calls. All figures are illustrative demo data.
 */

/* ---------- 0. Upload ---------- */

function UploadScene({ p }: { p: number }) {
  const move = ease(seg(p, 0.08, 0.45));
  const pct = seg(p, 0.48, 0.86);
  const done = p > 0.88;
  const dropped = p > 0.4;
  return (
    <Shell>
      <Heading
        title="New course"
        aside={
          <span className="flex gap-1 text-[11px]">
            <span className="rounded-md bg-primary px-2 py-1 text-primary-foreground">PDF</span>
            <span className="rounded-md border px-2 py-1 text-muted-foreground">Paste text</span>
          </span>
        }
      />
      <div className="relative min-h-0 flex-1">
        <p className="text-[11px] text-muted-foreground">Your files</p>
        <div
          className="absolute inset-x-0 bottom-0 top-[22%] flex flex-col items-center justify-end rounded-xl border-2 border-dashed pb-3 text-center transition-[border-color,box-shadow,background-color] duration-300"
          style={{
            borderColor: dropped ? "var(--brand-1)" : "var(--border)",
            background: dropped ? tint("var(--brand-1)", 7) : "transparent",
            boxShadow: dropped ? `0 0 40px -8px ${tint("var(--brand-1)", 55)}` : "none",
          }}
        >
          <Upload className="mb-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs font-medium">{done ? "Uploaded" : "Drop your PDF here"}</p>
          <p className="text-[10px] text-muted-foreground">Up to 20 pages · 10 MB</p>
        </div>
        <div
          className="absolute left-1/2 w-[78%] max-w-72 rounded-xl border bg-card p-3 shadow-lg"
          style={{
            top: `${lerp(10, 32, move)}%`,
            transform: `translateX(-50%) rotate(${lerp(-4, 0, move)}deg) scale(${1 + Math.sin(move * Math.PI) * 0.05})`,
            boxShadow: `0 ${lerp(6, 18, Math.sin(move * Math.PI))}px 30px -10px rgb(var(--shadow-color) / 0.35)`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg brand-fill text-white">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">python-loops-lists.pdf</p>
              <p className="text-[10px] text-muted-foreground">
                {done ? "7 pages found · text extracted" : "Sample chapter · 412 KB"}
              </p>
            </div>
            {done && <Check className="h-4 w-4 text-success" aria-hidden="true" />}
          </div>
          <div className="mt-2.5" style={{ opacity: seg(p, 0.44, 0.5) }}>
            <Bar value={pct} />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {done ? "Opening preview…" : `Uploading ${Math.round(pct * 100)}%`}
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- 1. Read ---------- */

const PAGES = [
  {
    n: 2,
    title: "The for loop",
    text: "A for loop repeats a block of code once for each item in a sequence.",
    mark: "repeats a block of code once for each item",
    code: 'for i in range(3):\n    print("Hello", i)',
    topic: "For loops",
    terms: ["loop", "loop variable", "loop body"],
  },
  {
    n: 4,
    title: "Meet range()",
    text: "range() produces a sequence of whole numbers. It can take one, two or three arguments.",
    mark: "range() produces a sequence of whole numbers",
    code: "range(0, 10, 2)  # 0, 2, 4, 6, 8",
    topic: "range()",
    terms: ["range()", "start", "stop", "step"],
  },
  {
    n: 5,
    title: "Where does range() stop?",
    text: "The stop value is never included. range(5) stops before 5, so the last number is 4.",
    mark: "The stop value is never included",
    code: "range(1, 6)  # 1, 2, 3, 4, 5",
    topic: "Stop value",
    terms: ["stop value", "fence posts"],
  },
  {
    n: 6,
    title: "Off-by-one errors",
    text: "The most common loop bug is the off-by-one error: one lap too many or too few.",
    mark: "off-by-one error",
    code: "range(1, 5)  # misses 5",
    topic: "Off-by-one errors",
    terms: ["off-by-one", "first and last value"],
  },
  {
    n: 7,
    title: "Accumulating a total",
    text: "A common pattern is to start a variable at zero and add to it each time around the loop.",
    mark: "start a variable at zero",
    code: "total = 0",
    topic: "Accumulators",
    terms: ["accumulator", "total"],
  },
] as const;

function ReadScene({ p }: { p: number }) {
  const read = seg(p, 0, 0.8) * PAGES.length;
  const idx = Math.min(PAGES.length - 1, Math.floor(read));
  const local = clamp(read - idx);
  const page = PAGES[idx];
  const markAt = page.text.indexOf(page.mark);
  const final = p > 0.88;
  return (
    <Shell className="@lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 gap-2.5">
        <div className="hidden w-9 shrink-0 flex-col gap-1.5 @sm:flex" aria-hidden="true">
          {PAGES.map((pg, i) => (
            <div
              key={pg.n}
              className="flex h-12 items-end justify-center rounded border pb-0.5 text-[9px] text-muted-foreground transition-all duration-300"
              style={{
                borderColor: i === idx ? "var(--brand-2)" : undefined,
                background: i <= idx ? tint("var(--brand-2)", 10) : "var(--muted)",
                transform: i === idx ? "scale(1.08)" : undefined,
              }}
            >
              p.{pg.n}
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border bg-background/80 p-3 @xl:p-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Page {page.n} of 7 · sample</span>
            <span>Reading… {Math.round(seg(p, 0, 0.8) * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="brand-fill h-full" style={{ width: `${seg(p, 0, 0.8) * 100}%` }} />
          </div>
          <h4 className="mt-3 text-xs font-semibold @md:text-sm @xl:text-base">{page.title}</h4>
          <p className="mt-1.5 text-[11px] leading-5 @md:text-xs @md:leading-6 @xl:text-sm @xl:leading-7">
            {page.text.slice(0, markAt)}
            <mark
              className="rounded-sm px-0.5 text-foreground"
              style={{
                background: `linear-gradient(${tint("var(--brand-3)", 45)},${tint("var(--brand-3)", 45)}) no-repeat left / ${ease(seg(local, 0.15, 0.7)) * 100}% 100%`,
                boxDecorationBreak: "clone",
              }}
            >
              {page.mark}
            </mark>
            {page.text.slice(markAt + page.mark.length)}
          </p>
          <Code code={page.code} className="mt-2 @xl:mt-4" />
          <p className="mt-3 text-[10px] text-muted-foreground">Key terms spotted</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {page.terms.map((t, k) => (
              <span
                key={t}
                className="rounded-full border px-2 py-0.5 text-[10px] transition-opacity"
                style={{
                  opacity: ease(seg(local, 0.45 + k * 0.1, 0.6 + k * 0.1)),
                  background: tint("var(--brand-1)", 12),
                  borderColor: tint("var(--brand-1)", 40),
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 @lg:w-[42%]">
        <p className="text-[11px] font-medium text-muted-foreground">
          {final ? "Course outline · ready" : "Topics found"}
        </p>
        {PAGES.map((pg, i) => {
          const t = ease(seg(read, i + 0.45, i + 0.9));
          return (
            <div
              key={pg.n}
              className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs shadow-xs @xl:py-2.5 @xl:text-sm"
              style={{ opacity: t, transform: `translateX(${(1 - t) * 18}px)` }}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white brand-fill">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{pg.topic}</span>
              <Chip>p.{pg.n}</Chip>
            </div>
          );
        })}
        <div style={{ opacity: seg(p, 0.86, 0.95) }}>
          <Chip tone="good">
            <Check className="h-3 w-3" aria-hidden="true" /> Grounded in your pages
          </Chip>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- 2. Quiz ---------- */

const OPTIONS = ["[1, 2, 3, 4, 5]", "[1, 2, 3, 4]", "[0, 1, 2, 3, 4]", "[2, 3, 4, 5]"];

function QuizScene({ p }: { p: number }) {
  const picked = p > 0.38;
  const graded = p > 0.52;
  const weak = seg(p, 0.76, 0.9);
  return (
    <Shell>
      <Heading
        title="Diagnostic quiz"
        aside={<span className="text-[11px] text-muted-foreground">Question 3 of 7</span>}
      />
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < 2 || (i === 2 && graded) ? "brand-fill" : "bg-muted",
            )}
            style={i === 2 && !graded ? { background: tint("var(--brand-2)", 55) } : undefined}
          />
        ))}
      </div>
      <p
        className="text-sm font-semibold @md:text-base @xl:text-xl"
        style={{ opacity: ease(seg(p, 0, 0.1)) }}
      >
        What does{" "}
        <code className="rounded bg-muted px-1 font-mono text-[0.92em]">list(range(1, 5))</code>{" "}
        return?
      </p>
      <div className="grid gap-1.5 @lg:grid-cols-2">
        {OPTIONS.map((o, i) => {
          const t = ease(seg(p, 0.08 + i * 0.05, 0.2 + i * 0.05));
          const isPick = i === 0 && picked;
          const isRight = i === 1 && graded;
          return (
            <div
              key={o}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors @xl:px-3.5 @xl:py-3 @xl:text-sm duration-300"
              style={{
                opacity: t,
                transform: `translateY(${(1 - t) * 10}px)`,
                borderColor: isRight
                  ? "var(--success)"
                  : isPick
                    ? graded
                      ? "var(--warning)"
                      : "var(--brand-2)"
                    : undefined,
                background: isRight
                  ? tint("var(--success)", 10)
                  : isPick
                    ? tint(graded ? "var(--warning)" : "var(--brand-2)", 10)
                    : undefined,
              }}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded border text-[9px] text-muted-foreground">
                {"ABCD"[i]}
              </span>
              {o}
              {isRight && <Check className="ml-auto h-3.5 w-3.5 text-success" aria-hidden="true" />}
              {isPick && graded && (
                <X className="ml-auto h-3.5 w-3.5 text-warning" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
      <div
        className="rounded-lg border bg-muted/60 p-2.5 text-[11px] leading-5 @md:text-xs @xl:p-3.5 @xl:text-sm"
        style={{
          opacity: ease(seg(p, 0.54, 0.64)),
          transform: `translateY(${(1 - ease(seg(p, 0.54, 0.64))) * 8}px)`,
        }}
      >
        <span className="font-medium">Not quite.</span> The stop value is never included, so{" "}
        <code className="font-mono">range(1, 5)</code> ends at 4.{" "}
        <Chip className="ml-1">Source: page 5</Chip>
      </div>
      <div
        className="flex items-center gap-2.5 rounded-lg border border-warning/40 bg-warning/10 p-2.5 @xl:p-3.5"
        style={{ opacity: weak, transform: `scale(${lerp(0.96, 1, weak)})` }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Weak topic found: Loops</p>
          <p className="text-[10px] text-muted-foreground">
            range(): 1 of 3 correct, below 60%. Your plan now starts with Loops.
          </p>
          <div className="mt-1.5">
            <Bar value={weak * 0.33} tone="warn" />
          </div>
        </div>
        <Chip tone="warn">33%</Chip>
      </div>
    </Shell>
  );
}

/* ---------- Plan ---------- */

const PLAN = [
  { name: "For loops", score: 83, level: "strong", action: "Quick review" },
  { name: "Loops", score: 33, level: "weak", action: "Lesson + exercise" },
  { name: "Off-by-one errors", score: 40, level: "weak", action: "Lesson + exercise" },
  { name: "Accumulators", score: 67, level: "okay", action: "Practice" },
] as const;
const PLAN_ORDER = [3, 0, 1, 2];
const ROW = 56;

function PlanScene({ p }: { p: number }) {
  const sort = ease(seg(p, 0.3, 0.66));
  const flag = seg(p, 0.12, 0.3);
  const cta = seg(p, 0.78, 0.9);
  return (
    <Shell>
      <Heading title="Revision plan" aside={<Chip tone="brand">v1</Chip>} />
      <p className="text-[11px] text-muted-foreground">
        Ordered by mastery, weakest first · sample scores
      </p>
      <div className="relative min-h-0 flex-1" style={{ minHeight: ROW * PLAN.length }}>
        {PLAN.map((t, i) => {
          const y = lerp(i, PLAN_ORDER[i], sort) * ROW;
          const weak = t.level === "weak";
          return (
            <div
              key={t.name}
              className="absolute inset-x-0 flex items-center gap-2.5 rounded-xl border bg-card px-3 shadow-xs"
              style={{
                height: ROW - 8,
                transform: `translateY(${y}px)`,
                borderColor: weak
                  ? `color-mix(in srgb, var(--warning) ${flag * 55}%, var(--border))`
                  : undefined,
              }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                {PLAN_ORDER[i] + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold @md:text-sm @xl:text-base">{t.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{t.action}</p>
              </div>
              {weak && sort > 0.7 && (
                <Chip tone="warn" className="hidden @sm:inline-flex">
                  Priority
                </Chip>
              )}
              <Chip tone={t.level === "strong" ? "good" : weak ? "warn" : "muted"}>{t.score}%</Chip>
            </div>
          );
        })}
      </div>
      <div
        className="brand-fill flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white shadow-lg @xl:h-12"
        style={{ opacity: lerp(0.35, 1, cta), transform: `scale(${lerp(0.97, 1, cta)})` }}
      >
        Start learning: Loops <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </Shell>
  );
}

/* ---------- 5 & 6. Code + Guru share one editor ---------- */

const BUG = "total = 0\nfor i in range(1, 5):\n    total = total + i\nprint(total)";
const FIX = BUG.replace("range(1, 5)", "range(1, 6)");

function Editor({
  code,
  chars,
  active,
  warn,
  good,
  run,
  output,
  test,
  guru,
}: {
  code: string;
  chars?: number;
  active?: number;
  warn?: number;
  good?: number;
  run: boolean;
  output: string | null;
  test: { ok: boolean; text: string } | null;
  guru?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 @xl:gap-3">
      <div className="flex items-center gap-1.5">
        <span className="rounded-md border bg-muted px-2 py-0.5 font-mono text-[10px]">
          main.py
        </span>
        <span className="flex-1" />
        <span
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-transform"
          style={{
            transform: run ? "scale(0.94)" : undefined,
            boxShadow: run ? `0 0 0 3px ${tint("var(--brand-2)", 30)}` : undefined,
          }}
        >
          <Play className="h-3 w-3" aria-hidden="true" /> Run
        </span>
        <span className="rounded-md border px-2.5 py-1 text-[11px]">Check</span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]",
            guru && "border-transparent text-white brand-fill",
          )}
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />{" "}
          <span className="hidden @sm:inline">Ask Guru</span>
        </span>
      </div>
      <Code code={code} chars={chars} active={active} warn={warn} good={good} />
      <div className="rounded-lg border bg-background/80 p-2 font-mono text-[11px] @xl:p-3 @xl:text-sm">
        <p className="mb-0.5 font-sans text-[10px] text-muted-foreground">Output</p>
        <p className="h-4">
          {output ?? <span className="text-muted-foreground">Console ready</span>}
        </p>
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors @xl:p-3 @xl:text-sm",
          test
            ? test.ok
              ? "border-success/40 bg-success/10 text-success"
              : "border-warning/40 bg-warning/10 text-warning"
            : "opacity-0",
        )}
      >
        {test?.ok ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {test?.text ?? "…"}
      </div>
    </div>
  );
}

function CodeScene({ p }: { p: number }) {
  const typed = Math.floor(BUG.length * ease(seg(p, 0.14, 0.58)));
  const typing = p > 0.14 && typed < BUG.length;
  const running = p > 0.62 && p < 0.7;
  const output = p > 0.68 ? "10" : null;
  const failed = p > 0.82;
  return (
    <Shell>
      <Heading title="Exercise 1: add the numbers 1 to 5" aside={<Chip>Python</Chip>} />
      <p
        className="text-[11px] leading-5 text-muted-foreground @md:text-xs"
        style={{ opacity: ease(seg(p, 0, 0.1)) }}
      >
        Use a loop to add 1 + 2 + 3 + 4 + 5, then print the total. Your hidden tests expect 15.
      </p>
      <Editor
        code={BUG}
        chars={typed}
        active={typing ? undefined : p > 0.58 && !failed ? 2 : undefined}
        warn={failed ? 2 : undefined}
        run={running}
        output={output}
        test={failed ? { ok: false, text: "Test failed: expected 15, got 10" } : null}
      />
    </Shell>
  );
}

const HINT =
  "Look at the last number your loop visits. What is the biggest value range(1, 5) produces?";

function GuruScene({ p }: { p: number }) {
  const open = ease(seg(p, 0.06, 0.2));
  const ask = seg(p, 0.2, 0.3);
  const hint = Math.floor(HINT.length * seg(p, 0.32, 0.6));
  const reply = seg(p, 0.62, 0.7);
  const fixed = p > 0.78;
  return (
    <Shell className="@lg:flex-row">
      <Editor
        code={fixed ? FIX : BUG}
        warn={!fixed ? 2 : undefined}
        good={fixed ? 2 : undefined}
        run={false}
        output={fixed ? "15" : "10"}
        test={
          fixed
            ? { ok: true, text: "All tests passed: expected 15, got 15" }
            : { ok: false, text: "Test failed: expected 15, got 10" }
        }
        guru={open > 0.1}
      />
      <aside
        aria-label="Guru, sample conversation"
        className="flex min-h-0 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border bg-muted/50 p-2.5 @lg:w-[46%]"
        style={{ opacity: open, transform: `translateY(${(1 - open) * 14}px)` }}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" /> Guru
          <Chip className="ml-auto">Hint 1 of 3</Chip>
        </p>
        <p
          className="ml-auto max-w-[90%] rounded-xl rounded-br-sm bg-primary px-2.5 py-1.5 text-[11px] text-primary-foreground"
          style={{ opacity: ask, transform: `translateY(${(1 - ask) * 6}px)` }}
        >
          Why do I get 10 instead of 15?
        </p>
        <p className="min-h-[3.4rem] max-w-[95%] rounded-xl rounded-bl-sm border bg-card px-2.5 py-1.5 text-[11px] leading-5">
          {HINT.slice(0, hint)}
          {hint > 0 && hint < HINT.length && (
            <span aria-hidden="true" className="demo-caret">
              ▍
            </span>
          )}
        </p>
        <p
          className="ml-auto max-w-[90%] rounded-xl rounded-br-sm bg-primary px-2.5 py-1.5 text-[11px] text-primary-foreground"
          style={{ opacity: reply }}
        >
          It stops at 4. So I need range(1, 6)?
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <span style={{ opacity: seg(p, 0.5, 0.6) }}>
            <Chip tone="brand">Cites page 6</Chip>
          </span>
          <span className="text-[10px] text-muted-foreground">
            Sample conversation, not a live chat.
          </span>
        </div>
      </aside>
    </Shell>
  );
}

/* ---------- 7. Mastery ---------- */

const MASTERY = [
  { name: "Loops", from: 33, to: 82 },
  { name: "Off-by-one errors", from: 40, to: 61 },
  { name: "Accumulators", from: 67, to: 72 },
  { name: "For loops", from: 83, to: 86 },
] as const;

function levelOf(v: number): "weak" | "okay" | "strong" {
  return v < 60 ? "weak" : v < 80 ? "okay" : "strong";
}

function MasteryScene({ p, href }: { p: number; href: string }) {
  const grow = ease(seg(p, 0.15, 0.6));
  const banner = seg(p, 0.6, 0.74);
  const cta = seg(p, 0.8, 0.92);
  return (
    <Shell>
      <Heading
        title="Your progress"
        aside={
          <Chip tone="good">
            <Check className="h-3 w-3" aria-hidden="true" /> Exercise 1 passed
          </Chip>
        }
      />
      <div className="grid gap-1.5">
        {MASTERY.map((t) => {
          const v = Math.round(lerp(t.from, t.to, grow));
          const lvl = levelOf(v);
          return (
            <div
              key={t.name}
              className="rounded-lg border bg-card px-2.5 py-1.5 @xl:px-3.5 @xl:py-2"
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{t.name}</span>
                <Chip tone={lvl === "strong" ? "good" : lvl === "weak" ? "warn" : "muted"}>
                  {lvl} · {v}%
                </Chip>
              </div>
              <Bar
                value={v / 100}
                tone={lvl === "strong" ? "good" : lvl === "weak" ? "warn" : "brand"}
              />
            </div>
          );
        })}
      </div>
      <div
        className="rounded-lg border p-2.5 text-[11px] leading-5 @md:text-xs"
        style={{
          opacity: banner,
          borderColor: tint("var(--brand-2)", 45),
          background: tint("var(--brand-2)", 8),
        }}
      >
        <span className="font-semibold">Plan v2:</span> Loops moved from weak to strong. Next up:
        Off-by-one errors.
      </div>
      <p className="text-[10px] text-muted-foreground">
        Mastery = half quiz accuracy, half exercises passed. Illustrative numbers.
      </p>
      <div
        className="mt-auto"
        style={{ opacity: cta, transform: `translateY(${(1 - cta) * 8}px)` }}
      >
        <Link
          href={href}
          tabIndex={cta > 0.5 ? 0 : -1}
          className="brand-fill flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Start your own journey <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Shell>
  );
}

export function StoryScene({
  stage,
  p,
  href,
  subject = "python",
  onAdvance,
}: {
  stage: number;
  p: number;
  href: string;
  subject?: Subject;
  /** Called when the visitor picks "See Loops run" on the concept map. */
  onAdvance?: () => void;
}) {
  const style: CSSProperties = { contain: "layout paint" };
  return (
    <div className="h-full" style={style}>
      {stage === 0 && <UploadScene p={p} />}
      {stage === 1 && <ReadScene p={p} />}
      {stage === 2 && <MapScene p={p} subject={subject} onAdvance={onAdvance} />}
      {stage === 3 && <QuizScene p={p} />}
      {stage === 4 && <PlanScene p={p} />}
      {stage === 5 && <LoopScene p={p} subject={subject} />}
      {stage === 6 && <WebScene p={p} />}
      {stage === 7 && <CodeScene p={p} />}
      {stage === 8 && <GuruScene p={p} />}
      {stage === 9 && <MasteryScene p={p} href={href} />}
    </div>
  );
}
