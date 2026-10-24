import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared maths and primitives for the landing page's presentational scenes. */

export const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
/** Portion of p between a and b, 0..1. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-2.5 overflow-hidden p-3 @md:gap-3 @md:p-5 @xl:gap-4 @xl:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Heading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold tracking-tight @md:text-base @xl:text-lg">{title}</h3>
      {aside}
    </div>
  );
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "good" | "warn" | "brand";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap @md:text-[11px]",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "good" && "border-success/30 bg-success/10 text-success",
        tone === "warn" && "border-warning/30 bg-warning/10 text-warning",
        tone === "brand" && "border-transparent text-white brand-fill",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Bar({
  value,
  tone = "brand",
}: {
  value: number;
  tone?: "brand" | "warn" | "good";
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full origin-left rounded-full",
          tone === "brand" && "brand-fill",
          tone === "warn" && "bg-warning",
          tone === "good" && "bg-success",
        )}
        style={{ transform: `scaleX(${clamp(value)})` }}
      />
    </div>
  );
}

/* ---------- Python code ---------- */

export type Lang = "python" | "html" | "css";

const MUTED = "text-muted-foreground italic";
const KEYWORD = "demo-token-keyword";
const NUMBER = "demo-token-number";

/** Tiny tokenizer per language. Text goes through React children, so nothing is ever parsed as HTML. */
export function highlight(line: string, lang: Lang = "python"): ReactNode[] {
  const re =
    lang === "html"
      ? /(<\/?[A-Za-z][A-Za-z0-9]*|\/?>|[a-z-]+(?==)|"[^"]*")/
      : lang === "css"
        ? /(\/\*.*?\*\/|\.[A-Za-z-]+|#[0-9a-fA-F]{3,8}|[a-z-]+(?=:)|\b\d+(?:px)?)/
        : /(#.*$|"[^"]*"|\b(?:for|in|range|print|def|return)\b|\b\d+\b)/;
  return line.split(re).map((t, i) => {
    if (!t) return null;
    if (i % 2 === 0) return t;
    if (t.startsWith("#") && lang === "python")
      return (
        <span key={i} className={MUTED}>
          {t}
        </span>
      );
    if (t.startsWith('"'))
      return (
        <span key={i} className="text-success">
          {t}
        </span>
      );
    if (/^\d/.test(t) || (lang === "css" && t.startsWith("#")))
      return (
        <span key={i} className={NUMBER}>
          {t}
        </span>
      );
    return (
      <span key={i} className={KEYWORD}>
        {t}
      </span>
    );
  });
}

interface CodeProps {
  code: string;
  /** Characters revealed so far (typing). Omit to show everything. */
  chars?: number;
  /** One line number, or several (an HTML element highlights its open and close tags). */
  active?: number | number[];
  warn?: number;
  good?: number;
  lang?: Lang;
  className?: string;
}

export function Code({ code, chars, active, warn, good, lang = "python", className }: CodeProps) {
  const isActive = (n: number) => (Array.isArray(active) ? active.includes(n) : n === active);
  const lines = code.split("\n");
  const typing = chars !== undefined;
  return (
    <pre
      aria-label={`Illustrative ${lang === "python" ? "Python" : lang.toUpperCase()} code`}
      className={cn(
        "overflow-hidden rounded-lg border bg-background/80 py-1.5 font-mono text-[11px] leading-5 @md:text-xs @md:leading-6 @xl:py-3 @xl:text-[13px] @xl:leading-7",
        className,
      )}
    >
      {lines.map((line, i) => {
        const here = (chars ?? 0) - lines.slice(0, i).reduce((sum, l) => sum + l.length + 1, 0);
        const shown = typing ? line.slice(0, Math.max(0, here)) : line;
        const caret = typing && here >= 0 && here <= line.length && chars! < code.length;
        const n = i + 1;
        const bg =
          n === warn
            ? tint("var(--warning)", 16)
            : n === good
              ? tint("var(--success)", 14)
              : isActive(n)
                ? tint("var(--brand-2)", 15)
                : undefined;
        const edge =
          n === warn
            ? "var(--warning)"
            : n === good
              ? "var(--success)"
              : isActive(n)
                ? "var(--brand-2)"
                : "transparent";
        return (
          <div
            key={i}
            className="flex whitespace-pre transition-colors duration-200"
            style={{ background: bg, boxShadow: `inset 2px 0 0 ${edge}` }}
          >
            <span className="w-7 shrink-0 pr-2 text-right text-muted-foreground/70 select-none">
              {n}
            </span>
            <span>
              {highlight(shown, lang)}
              {caret && (
                <span
                  aria-hidden="true"
                  className="demo-caret -mb-0.5 ml-px inline-block h-3.5 w-[2px] bg-foreground align-middle"
                />
              )}
            </span>
          </div>
        );
      })}
    </pre>
  );
}
