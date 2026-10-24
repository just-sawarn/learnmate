"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ArrowRight,
  Atom,
  Braces,
  ChevronDown,
  Code2,
  Coffee,
  Cog,
  Cpu,
  Globe,
  Hash,
  Menu,
  Moon,
  Palette,
  Plus,
  Sun,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FallingText } from "@/components/design/falling-text";
import {
  EASE,
  GuruBubble,
  ProviderChip,
  TypingDots,
  inView,
  reveal,
  stagger,
  useReduce,
} from "@/components/design/lm-kit";
import { BookMark } from "@/components/design/lm-hero";
import { useTheme } from "next-themes";
import { COPY } from "@/components/design/lm-copy";
import { cn } from "@/lib/utils";

/** Languages the side-along IDE offers (HTML and CSS are one workspace). */
const ROW_A = ["Python", "JavaScript", "HTML", "CSS", "React"];
const ROW_B = ["C", "C++", "Java", "Go", "Rust"];
const LANG_ICON: Record<string, LucideIcon> = {
  Python: Terminal,
  JavaScript: Braces,
  HTML: Globe,
  CSS: Palette,
  React: Atom,
  C: Hash,
  "C++": Cpu,
  Java: Coffee,
  Go: Code2,
  Rust: Cog,
};

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2"
    >
      <Sun size={17} aria-hidden="true" className="hidden dark:block" />
      <Moon size={17} aria-hidden="true" className="dark:hidden" />
    </button>
  );
}

/* ---------- header ---------- */

export function LmHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 24], [0, 1]);
  const cta = signedIn
    ? { label: "Go to dashboard", href: "/dashboard" }
    : { label: "Try LearnMate", href: "/signin" };
  return (
    <header className="sticky top-0 z-50">
      <motion.div
        aria-hidden="true"
        style={{ opacity: bg }}
        className="absolute inset-0 border-b border-line bg-bg/92"
      />
      <nav
        aria-label="Main"
        className="relative mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6"
      >
        <Link href="/" aria-label="LearnMate home" className="rounded-md">
          <span className="inline-flex items-center gap-2 text-ink">
            <BookMark />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">LearnMate</span>
          </span>
        </Link>
        <ul className="m-0 hidden list-none items-center gap-1 p-0 md:flex">
          {COPY.nav.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3.5 py-2 text-[15px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          {!signedIn && (
            <Link
              href="/signin"
              className="hidden rounded-full px-3.5 py-2 text-[15px] text-ink-2 transition-colors hover:text-ink sm:block"
            >
              Sign in
            </Link>
          )}
          <Link
            href={cta.href}
            className="rounded-full bg-ink px-4 py-2 text-[15px] font-medium text-bg transition-transform hover:-translate-y-px active:translate-y-0"
          >
            {cta.label}
          </Link>
          <ThemeSwitch />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink md:hidden"
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-x-3 top-[68px] rounded-[20px] border border-line bg-surface p-3 shadow-raised md:hidden"
          >
            <ul className="m-0 flex list-none flex-col p-0">
              {[...COPY.nav, ...(signedIn ? [] : [{ label: "Sign in", href: "/signin" }])].map(
                (l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-4 py-3 text-[16px] text-ink hover:bg-surface-2"
                    >
                      {l.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ---------- shared heading ---------- */

export function SectionHeading({
  eyebrow,
  title,
  id,
  className,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  id: string;
  className?: string;
  /** A single-line heading for use inside the pinned How it works composition. */
  compact?: boolean;
}) {
  return (
    <div className={className}>
      <motion.p
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={inView}
        className={cn(
          "text-xs font-medium tracking-[0.14em] text-lm-muted uppercase",
          compact ? "mb-1.5" : "mb-3",
        )}
      >
        {eyebrow}
      </motion.p>
      <h2
        id={id}
        className={cn(
          "m-0 leading-[1.08] font-semibold tracking-[-0.03em] text-ink",
          compact
            ? "text-[24px] text-balance sm:text-[30px] lg:text-[34px]"
            : "max-w-[18ch] text-[34px] sm:text-[44px]",
        )}
      >
        <FallingText text={title} trigger="view" />
      </h2>
    </div>
  );
}

/** The persistent section heading and intro. It lives inside the pinned composition, so it stays put. */
export function HowHeader() {
  return (
    <div className="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
      <SectionHeading eyebrow={COPY.how.eyebrow} title={COPY.how.title} id="how-title" compact />
      <p className="m-0 max-w-md text-sm leading-6 text-ink-2 max-sm:sr-only lg:text-right">
        Four steps: upload a PDF, watch animated lessons play, try the exercise in the IDE with
        Guru&apos;s help, and watch your mastery and revision plan update.
      </p>
    </div>
  );
}

/* ---------- trust strip ---------- */

export function TrustStrip() {
  return (
    <section aria-label="Powered by" className="border-y border-line px-4 py-8 sm:px-6">
      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
        className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <motion.p
          variants={reveal}
          className="m-0 text-xs font-medium tracking-[0.14em] text-lm-muted uppercase"
        >
          {COPY.trust.label}
        </motion.p>
        <ul className="m-0 grid w-full list-none grid-cols-2 gap-x-8 gap-y-5 p-0 lg:flex lg:w-auto lg:gap-12">
          {COPY.trust.items.map((it) => (
            <motion.li key={it.name} variants={reveal}>
              <span className="block text-[22px] font-semibold tracking-[-0.02em] text-ink">
                {it.name}
              </span>
              <span className="text-sm text-lm-muted">{it.role}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

/* ---------- problem ---------- */

function Word({
  word,
  i,
  n,
  progress,
}: {
  word: string;
  i: number;
  n: number;
  progress: MotionValue<number>;
}) {
  // The sentence "fills in" as you scroll: each word moves from muted to full ink.
  const opacity = useTransform(progress, [i / n, (i + 1) / n], [0.38, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {word}
    </motion.span>
  );
}

export function Problem() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReduce();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const words = COPY.problem.resolution.split(" ");
  return (
    <section
      ref={ref}
      aria-label="The problem"
      className="lm-aura lm-aura--slate px-4 py-14 sm:px-6 lg:py-[84px]"
    >
      <div className="mx-auto max-w-[980px]">
        <motion.p
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={inView}
          className="m-0 text-xs font-medium tracking-[0.14em] text-lm-muted uppercase"
        >
          {COPY.problem.eyebrow}
        </motion.p>
        <h2 className="mt-3 mb-7 text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-ink sm:text-[48px]">
          <FallingText text={COPY.problem.lead} trigger="view" />
        </h2>
        <ul className="m-0 mb-8 flex list-none flex-col gap-3 p-0">
          {COPY.problem.struck.map((line, i) => (
            <li key={line} className="relative w-fit text-[22px] text-lm-muted sm:text-[28px]">
              {line}
              <motion.span
                aria-hidden="true"
                className="absolute top-1/2 left-0 h-[2px] w-full origin-left bg-ink"
                initial={{ scaleX: reduced ? 1 : 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={inView}
                transition={{ duration: 0.7, ease: EASE, delay: 0.3 + 0.25 * i }}
              />
            </li>
          ))}
        </ul>
        <p className="m-0 text-[30px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
          <span className="lm-sr">{COPY.problem.resolution}</span>
          <span aria-hidden="true">
            {words.map((w, i) =>
              reduced ? (
                <span key={i} className="mr-[0.25em] inline-block">
                  {w}
                </span>
              ) : (
                <Word key={i} word={w} i={i} n={words.length} progress={scrollYProgress} />
              ),
            )}
          </span>
        </p>
      </div>
    </section>
  );
}

/* ---------- features / how it works wrappers ---------- */

export function PageSection({
  id,
  labelledBy,
  className,
  children,
}: {
  id: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("lm-section px-4 py-14 sm:px-6 lg:py-[84px]", className)}
    >
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

/* ---------- Guru ---------- */

function StudentBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="max-w-[80%] self-end rounded-[16px] rounded-br-[4px] bg-ink px-3.5 py-2 text-[14px] text-bg"
    >
      {text}
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      className="w-fit rounded-[14px] border border-line bg-surface-2 px-3 py-2.5"
    >
      <TypingDots />
    </motion.div>
  );
}

/** A scripted sample conversation. It starts when scrolled into view and is not a live chat. */
function GuruChat() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReduce();
  const [step, setStep] = useState(0);
  const [looked, setLooked] = useState(false);
  const n = reduced ? 5 : step;
  const open = Boolean(reduced) || looked;
  useEffect(() => {
    if (reduced || !seen) return;
    const timers = [
      ...[300, 3600, 7600, 9000].map((ms, i) => setTimeout(() => setStep(i + 1), ms)),
      setTimeout(() => setStep(5), 11200),
      setTimeout(() => setLooked(true), 6600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [seen, reduced]);
  const [q1, a1, q2, a2] = COPY.guru.chat;
  return (
    <div
      ref={ref}
      className="flex h-[540px] flex-col gap-3 rounded-[24px] border border-line bg-surface p-5 shadow-raised sm:p-6"
    >
      <div className="flex items-center gap-2 border-b border-line pb-3 text-sm font-semibold text-ink">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs text-bg">
          G
        </span>
        Guru
        <ProviderChip provider="Claude" className="ml-auto" />
      </div>
      <AnimatePresence initial={false}>
        {n >= 1 && <StudentBubble key="q1" text={q1.text} />}
        {n === 1 && <TypingBubble key="t1" />}
        {n >= 2 && (
          <motion.div
            key="a1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <GuruBubble
              text={a1.text}
              play
              duration={reduced ? 1 : 3400}
              badge={false}
              className="shadow-none"
            />
          </motion.div>
        )}
        {n >= 2 && (
          <motion.div
            key="looked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduced ? 0 : 3.2 }}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setLooked((v) => !v)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-ink-2"
            >
              {COPY.guru.looked}
              <ChevronDown
                size={13}
                aria-hidden="true"
                className={cn("transition-transform duration-300", open && "rotate-180")}
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="m-0 overflow-hidden pl-3 font-mono text-xs text-lm-muted"
                >
                  <span className="block pt-2">{COPY.guru.lookedItems}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {n >= 3 && <StudentBubble key="q2" text={q2.text} />}
        {n === 3 && <TypingBubble key="t2" />}
        {n >= 4 && (
          <motion.div
            key="a2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <GuruBubble
              text={a2.text}
              play
              duration={reduced ? 1 : 2000}
              badge={false}
              className="shadow-none"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">{n === 1 || n === 3 ? "Guru is typing" : ""}</span>
    </div>
  );
}

export function GuruSection() {
  return (
    <section
      id="guru"
      aria-labelledby="guru-title"
      className="lm-section lm-aura lm-aura--beam px-4 py-14 sm:px-6 lg:py-[84px]"
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionHeading
            eyebrow={COPY.guru.eyebrow}
            title={COPY.guru.title}
            id="guru-title"
            className="mb-7"
          />
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {COPY.guru.manifesto.map((line, i) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={inView}
                transition={{ duration: 0.6, ease: EASE, delay: 0.12 * i }}
                className="border-l-2 border-ink pl-4 text-[19px] leading-[1.4] text-ink sm:text-[22px]"
              >
                {line}
              </motion.li>
            ))}
          </ul>
        </div>
        <GuruChat />
      </div>
    </section>
  );
}

/* ---------- languages ---------- */

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  // Six copies make two equal halves, so the -50% loop is seamless. Only the first set is announced.
  const copies = Array.from({ length: 6 }, () => items).flat();
  return (
    <div className="lm-marquee overflow-hidden">
      <div className={cn("lm-marquee-track", reverse && "rev")}>
        {copies.map((name, i) => {
          const Icon = LANG_ICON[name] ?? Terminal;
          return (
            <span
              key={i}
              aria-hidden={i >= items.length}
              className="mr-4 inline-flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-surface px-5 py-3 text-[17px] font-medium text-ink"
            >
              <Icon size={18} aria-hidden="true" />
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function Languages() {
  return (
    <section
      aria-label="Languages you can run"
      className="lm-aura lm-aura--beam py-14 lg:py-[84px]"
    >
      <p className="m-0 mb-6 px-4 text-center text-xs font-medium tracking-[0.14em] text-lm-muted uppercase">
        Runs in the side-along IDE
      </p>
      <div className="flex flex-col gap-4">
        <MarqueeRow items={ROW_A} />
        <MarqueeRow items={ROW_B} reverse />
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

export function Faq() {
  // A click pins an answer open. Resting a mouse on a question opens it only while the mouse is there.
  const [pinned, setPinned] = useState<number | null>(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const uid = useId();
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const hoverOpen = (e: React.PointerEvent, i: number) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHovered(i), 140);
  };
  const hoverEnd = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    setHovered(null);
  };
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="lm-section lm-aura lm-aura--slate px-4 py-14 sm:px-6 lg:py-[84px]"
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <SectionHeading eyebrow={COPY.faq.eyebrow} title={COPY.faq.title} id="faq-title" />
        <div className="divide-y divide-line border-y border-line">
          {COPY.faq.items.map((item, i) => {
            const active = pinned === i || hovered === i;
            return (
              <div
                key={item.q}
                className="faq-row -mx-3 rounded-2xl px-3"
                data-open={active}
                onPointerEnter={(e) => hoverOpen(e, i)}
                onPointerLeave={hoverEnd}
              >
                <h3 className="m-0">
                  <button
                    type="button"
                    aria-expanded={active}
                    aria-controls={`${uid}-${i}`}
                    onClick={() => {
                      if (pinned === i) {
                        setPinned(null);
                        setHovered(null);
                      } else setPinned(i);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left text-[18px] font-medium text-ink"
                  >
                    {item.q}
                    <motion.span
                      animate={{ rotate: active ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div
                      id={`${uid}-${i}`}
                      role="region"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="m-0 pb-5 text-[17px] leading-[1.6] text-ink-2">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- closing call to action and footer ---------- */

const GLYPHS = ["{ }", "( )", "=>", "for", "if", "[ ]", "i++", "def", "</>", "0", "1", "&&"];
const FIELD = Array.from({ length: 22 }, (_, i) => ({
  g: GLYPHS[i % GLYPHS.length],
  left: (37 * i + 9) % 94,
  top: (53 * i + 7) % 86,
  size: 18 + (i % 4) * 8,
  // Slow, wide travel across the panel: each glyph has its own distance, direction and pace.
  dx: (i % 2 ? -1 : 1) * (200 + ((i * 53) % 260)),
  dy: ((i * 29) % 90) - 45,
  duration: 38 + (i % 6) * 7,
  delay: -((i * 5.7) % 38),
}));

export function LmFinalCta({ href, label }: { href: string; label: string }) {
  // The glyphs drift only while the panel is on screen; the motion itself is a CSS transform loop.
  const panel = useRef<HTMLDivElement>(null);
  const onScreen = useInView(panel, { margin: "120px" });
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-12 sm:px-6 lg:pb-[84px]">
      <motion.div
        ref={panel}
        data-active={onScreen}
        variants={stagger(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
        className="brand-cta relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] px-6 py-14 text-center sm:py-20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 font-mono text-[#f3eee5] opacity-[0.1] select-none"
        >
          {FIELD.map((f, i) => (
            <span
              key={i}
              className="lm-glyph absolute"
              style={
                {
                  left: `${f.left}%`,
                  top: `${f.top}%`,
                  fontSize: f.size,
                  "--dx": `${f.dx}px`,
                  "--dy": `${f.dy}px`,
                  animationDuration: `${f.duration}s`,
                  animationDelay: `${f.delay}s`,
                } as CSSProperties
              }
            >
              {f.g}
            </span>
          ))}
        </div>
        <h2
          id="cta-title"
          className="relative m-0 text-[38px] leading-[1.05] font-semibold tracking-[-0.03em] text-[#f3eee5] sm:text-[60px]"
        >
          <FallingText text={COPY.cta.title} trigger="view" />
        </h2>
        <motion.div variants={reveal} className="relative mt-10">
          <Link
            href={href}
            className="group inline-flex items-center gap-2 rounded-full bg-[#f3eee5] px-7 py-4 text-[16px] font-medium text-[#111214] transition-transform hover:-translate-y-0.5"
          >
            {label}
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

export function LmFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="border-t border-line px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <span className="inline-flex items-center gap-2 text-ink">
            <BookMark />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">LearnMate</span>
          </span>
          <p className="mt-3 mb-0 text-[15px] text-ink-2">
            Turn your study material into lessons you can run.
          </p>
          <p className="mt-1 mb-0 text-sm text-lm-muted">Built in 24 hours at Equinox 2026</p>
        </div>
        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px]">
            <li>
              <a href="#features" className="text-ink-2 hover:text-ink">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="text-ink-2 hover:text-ink">
                How it works
              </a>
            </li>
            <li>
              <Link
                href={signedIn ? "/dashboard" : "/signin"}
                className="text-ink-2 hover:text-ink"
              >
                {signedIn ? "Dashboard" : "Sign in"}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-10 mb-0 max-w-[1200px] text-sm text-lm-muted">
        Gemini · Claude · Groq · Supabase
      </p>
    </footer>
  );
}
