"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Chip, clamp, Code, ease, Heading, seg, Shell, tint } from "@/components/design/scene-kit";
import {
  CSS_LINES,
  CSS_NOTES,
  DOM_NODES,
  HTML_LINES,
  LOOP_CODE,
  LOOP_TRACE,
  MIND_MAPS,
  type CssProp,
  type DomId,
  type MapNode,
  type Subject,
} from "@/components/design/teaching-data";
import { cn } from "@/lib/utils";

/*
 * Visual-teaching scenes shared by the hero renderer and the "Built around moments" previews.
 * Each is a pure function of `p` (0..1) plus a little local selection state. No timers, no network.
 */

const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* =====================================================================
 * Concept mind map
 * ===================================================================== */

const CENTER: [number, number] = [190, 120];
/** Clockwise from east. Slot 0 is the focus concept, which owns the child nodes. */
const SLOTS: [number, number][] = [
  [322, 120],
  [256, 188],
  [124, 188],
  [58, 120],
  [124, 52],
  [256, 52],
];
const CHILD_X = 492;
const CHILD_Y = [24, 72, 120, 168, 216];
/** Slots appear in this order, ending on the focus concept. */
const ORDER = [5, 4, 3, 1, 2, 0];

const width = (label: string) => Math.max(58, label.length * 7 + 22);

function Edge({
  from,
  to,
  t,
  active,
}: {
  from: [number, number];
  to: [number, number];
  t: number;
  active?: boolean;
}) {
  return (
    <path
      d={`M${from[0]} ${from[1]}L${to[0]} ${to[1]}`}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - t}
      fill="none"
      strokeLinecap="round"
      strokeWidth={active ? 2 : 1.25}
      style={{
        stroke: active
          ? "var(--brand-2)"
          : "color-mix(in srgb, var(--foreground) 22%, transparent)",
        transition: "stroke 250ms ease, stroke-width 250ms ease",
      }}
    />
  );
}

interface NodeProps {
  at: [number, number];
  label: string;
  pop: number;
  selected?: boolean;
  related?: boolean;
  dim?: boolean;
  onSelect: () => void;
}

function MapNodeShape({ at, label, pop, selected, related, dim, onSelect }: NodeProps) {
  const w = width(label);
  const live = pop > 0.7;
  return (
    <g
      className="mm-node"
      role="button"
      tabIndex={live ? 0 : -1}
      aria-pressed={Boolean(selected)}
      aria-label={label}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        pointerEvents: live ? "auto" : "none",
        opacity: clamp(pop * 1.6) * (dim ? 0.55 : 1),
        transform: `translate(${at[0]}px, ${at[1]}px) scale(${0.55 + 0.45 * pop})`,
        transition: "opacity 250ms ease",
      }}
    >
      <rect
        x={-w / 2}
        y={-14}
        width={w}
        height={28}
        rx={14}
        className="mm-node__box"
        style={{
          fill: selected ? "var(--brand-2)" : "var(--card)",
          stroke: selected
            ? "var(--brand-2)"
            : related
              ? "color-mix(in srgb, var(--brand-2) 65%, var(--border))"
              : "var(--border)",
          strokeWidth: related || selected ? 1.75 : 1,
        }}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12.5}
        fontWeight={selected ? 600 : 500}
        style={{ fill: selected ? "#fff" : "var(--foreground)", pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

/** Wide screens: a deterministic radial layout. Every position is fixed, so nothing ever jitters. */
export function ConceptMindMap({
  subject,
  p,
  selected,
  onSelect,
}: {
  subject: Subject;
  p: number;
  selected: string | null;
  onSelect: (label: string) => void;
}) {
  const map = MIND_MAPS[subject];
  const level1: MapNode[] = [map.focus, ...map.others];
  const focusOn = selected === map.focus.label || map.children.some((c) => c.label === selected);
  const centerPop = easeOutBack(seg(p, 0, 0.1));

  return (
    <svg
      viewBox="0 0 560 240"
      className="mm h-full w-full"
      role="group"
      aria-label={`Illustrative concept map for ${map.title}`}
    >
      {level1.map((n, slot) => {
        const k = ORDER.indexOf(slot);
        const start = 0.1 + k * 0.075;
        return (
          <Edge
            key={n.label}
            from={CENTER}
            to={SLOTS[slot]}
            t={ease(seg(p, start, start + 0.07))}
            active={selected === n.label}
          />
        );
      })}
      {map.children.map((c, i) => {
        const start = 0.66 + i * 0.045;
        return (
          <Edge
            key={c.label}
            from={SLOTS[0]}
            to={[CHILD_X, CHILD_Y[i]]}
            t={ease(seg(p, start, start + 0.07))}
            active={focusOn && (selected === c.label || selected === map.focus.label)}
          />
        );
      })}

      <g
        style={{
          opacity: clamp(centerPop * 1.6),
          transform: `translate(${CENTER[0]}px, ${CENTER[1]}px) scale(${0.55 + 0.45 * centerPop})`,
        }}
      >
        <rect x={-56} y={-26} width={112} height={52} rx={15} style={{ fill: "var(--primary)" }} />
        {map.title.split(" ").map((word, i, all) => (
          <text
            key={word}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12.5}
            fontWeight={600}
            y={(i - (all.length - 1) / 2) * 15}
            style={{ fill: "var(--primary-foreground)" }}
          >
            {word}
          </text>
        ))}
      </g>

      {level1.map((n, slot) => {
        const k = ORDER.indexOf(slot);
        const start = 0.1 + k * 0.075 + 0.04;
        return (
          <MapNodeShape
            key={n.label}
            at={SLOTS[slot]}
            label={n.label}
            pop={easeOutBack(seg(p, start, start + 0.07))}
            selected={
              selected === n.label || (slot === 0 && focusOn && selected === map.focus.label)
            }
            related={slot === 0 && focusOn}
            dim={selected !== null && !focusOn && selected !== n.label}
            onSelect={() => onSelect(n.label)}
          />
        );
      })}
      {map.children.map((c, i) => {
        const start = 0.66 + i * 0.045 + 0.04;
        return (
          <MapNodeShape
            key={c.label}
            at={[CHILD_X, CHILD_Y[i]]}
            label={c.label}
            pop={easeOutBack(seg(p, start, start + 0.07))}
            selected={selected === c.label}
            related={selected === map.focus.label}
            dim={selected !== null && !focusOn}
            onSelect={() => onSelect(c.label)}
          />
        );
      })}
    </svg>
  );
}

/** Narrow screens: the same map as two rows of chips, which stay legible on a phone. */
function MapChips({
  subject,
  p,
  selected,
  onSelect,
}: {
  subject: Subject;
  p: number;
  selected: string | null;
  onSelect: (label: string) => void;
}) {
  const map = MIND_MAPS[subject];
  const level1: MapNode[] = [map.focus, ...map.others];
  const chip = (n: MapNode, t: number, key: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={selected === n.label}
      onClick={() => onSelect(n.label)}
      className={cn(
        "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        selected === n.label
          ? "border-transparent text-white"
          : "bg-card text-foreground hover:border-foreground/40",
      )}
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 6}px)`,
        background: selected === n.label ? "var(--brand-2)" : undefined,
        pointerEvents: t > 0.7 ? "auto" : "none",
      }}
    >
      {n.label}
    </button>
  );
  return (
    <div className="flex h-full flex-col gap-3">
      <div
        className="mx-auto rounded-xl bg-primary px-4 py-2 text-center text-xs font-semibold text-primary-foreground"
        style={{ opacity: ease(seg(p, 0, 0.1)) }}
      >
        {map.title}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {ORDER.map((slot, k) => {
          const n = level1[slot];
          return chip(n, ease(seg(p, 0.1 + k * 0.075, 0.17 + k * 0.075)), n.label);
        })}
      </div>
      <p
        className="text-center text-[10px] text-muted-foreground"
        style={{ opacity: seg(p, 0.64, 0.7) }}
      >
        Inside {map.focus.label}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {map.children.map((c, i) =>
          chip(c, ease(seg(p, 0.66 + i * 0.045, 0.74 + i * 0.045)), c.label),
        )}
      </div>
    </div>
  );
}

function MapBody({
  p,
  subject,
  onAdvance,
}: {
  p: number;
  subject: Subject;
  onAdvance?: () => void;
}) {
  const map = MIND_MAPS[subject];
  const [picked, setPicked] = useState<string | null>(null);
  // Until the visitor picks something, the demo selects the focus concept on its own.
  const selected = picked ?? (p > 0.58 ? map.focus.label : null);
  const all: MapNode[] = [map.focus, ...map.others, ...map.children];
  const info = all.find((n) => n.label === selected);
  const reveal = picked ? 1 : ease(seg(p, 0.6, 0.72));

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <div className="hidden h-full sm:block">
          <ConceptMindMap subject={subject} p={p} selected={selected} onSelect={setPicked} />
        </div>
        <div className="h-full sm:hidden">
          <MapChips subject={subject} p={p} selected={selected} onSelect={setPicked} />
        </div>
      </div>
      <div
        aria-live="polite"
        className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2 text-[11px] leading-5 @md:text-xs @xl:text-sm"
        style={{ opacity: info ? reveal : 0.5 }}
      >
        <span>
          {info ? (
            <>
              <span className="font-semibold">{info.label}.</span> {info.blurb}
            </>
          ) : (
            "Concepts are being extracted from the document…"
          )}
        </span>
        {info?.label === map.focus.label && (
          <button
            type="button"
            onClick={onAdvance}
            disabled={!onAdvance}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white brand-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-default"
          >
            {map.next} <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
}

export function MapScene({
  p,
  subject,
  onAdvance,
}: {
  p: number;
  subject: Subject;
  onAdvance?: () => void;
}) {
  return (
    <Shell>
      <Heading title="Concept map" aside={<Chip>Illustrative · click a concept</Chip>} />
      <MapBody key={subject} p={p} subject={subject} onAdvance={onAdvance} />
    </Shell>
  );
}

/* =====================================================================
 * Python execution
 * ===================================================================== */

function FlowDiagram({ line, returning }: { line: 1 | 2; returning: boolean }) {
  const lit = "var(--brand-2)";
  const idle = "color-mix(in srgb, var(--foreground) 25%, transparent)";
  return (
    <svg viewBox="0 0 230 92" className="w-full max-w-[15rem]" aria-hidden="true">
      <defs>
        <marker
          id="flow-arrow"
          viewBox="0 0 8 8"
          refX="6"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0L8 4L0 8z" fill="context-stroke" />
        </marker>
      </defs>
      {[
        { y: 6, text: "for i in range(3)", on: line === 1 },
        { y: 58, text: "print(i)", on: line === 2 },
      ].map((b) => (
        <g key={b.text}>
          <rect
            x={8}
            y={b.y}
            width={128}
            height={28}
            rx={8}
            style={{
              fill: b.on ? tint("var(--brand-2)", 16) : "var(--card)",
              stroke: b.on ? lit : "var(--border)",
              strokeWidth: b.on ? 1.75 : 1,
              transition: "fill 200ms, stroke 200ms",
            }}
          />
          <text
            x={72}
            y={b.y + 15}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10.5}
            fontFamily="var(--font-mono)"
            style={{ fill: "var(--foreground)" }}
          >
            {b.text}
          </text>
        </g>
      ))}
      <path
        d="M72 34V56"
        fill="none"
        strokeWidth={1.75}
        markerEnd="url(#flow-arrow)"
        style={{ stroke: line === 2 && !returning ? lit : idle }}
      />
      <path
        d="M136 72C176 72 176 20 138 20"
        fill="none"
        strokeWidth={1.75}
        markerEnd="url(#flow-arrow)"
        style={{ stroke: returning ? lit : idle, transition: "stroke 200ms" }}
      />
      <text
        x={203}
        y={50}
        fontSize={8.5}
        textAnchor="middle"
        style={{ fill: "var(--muted-foreground)" }}
      >
        next lap
      </text>
    </svg>
  );
}

/** Steps through LOOP_TRACE. The code, variable, flow arrow, laps and output all read the same step. */
export function PythonExecutionVisualizer({ p }: { p: number }) {
  const typed = Math.floor(LOOP_CODE.length * ease(seg(p, 0, 0.12)));
  const running = p >= 0.14;
  const s = running ? Math.min(7, Math.floor(seg(p, 0.14, 0.97) * LOOP_TRACE.length)) : -1;
  const step = s >= 0 ? LOOP_TRACE[s] : null;
  const pre = !running && p > 0.1;

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-2.5 @xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Code code={LOOP_CODE} chars={typed} active={step?.line} />
          <div className="hidden @md:block">
            <FlowDiagram line={step?.line ?? 1} returning={Boolean(step?.returning)} />
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2.5 @xl:grid-cols-1 @xl:content-start">
          <div className="rounded-lg border bg-muted/40 p-2.5">
            <p className="text-[10px] text-muted-foreground">range(3) gives</p>
            <div className="mt-1.5 flex items-center gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((n) => {
                const used = step !== null && step.i !== null && n <= step.i;
                const now = step !== null && step.i === n && !step.done;
                return (
                  <span
                    key={n}
                    className="flex h-7 w-7 items-center justify-center rounded-md border font-mono text-xs transition-[background-color,color,transform] duration-200"
                    style={{
                      background: used ? "var(--brand-2)" : "var(--card)",
                      color: used ? "#fff" : "var(--muted-foreground)",
                      transform: now ? "scale(1.12)" : undefined,
                    }}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span
                key={step?.i ?? "none"}
                className="pop-in rounded-md border bg-card px-3 py-1 font-mono text-base font-semibold @md:text-lg"
                style={{ borderColor: step?.i != null ? "var(--brand-2)" : undefined }}
              >
                i = {step?.i ?? "?"}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                Lap {step?.lap ?? 0} of 3
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-background/80 p-2.5 font-mono text-xs">
            <p className="mb-1 font-sans text-[10px] text-muted-foreground">Output</p>
            <div className="min-h-[3.2rem] space-y-0.5">
              {(step?.out ?? []).map((n, k) => (
                <p key={k} className="pop-in">
                  {n}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        className="rounded-lg bg-foreground px-3 py-2 text-center text-[11px] text-background @md:text-xs @xl:text-sm"
        aria-live="polite"
      >
        {step ? step.caption : pre ? "The loop reads range(3): 0, 1, 2." : "Writing the loop…"}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {LOOP_TRACE.map((_, k) => (
          <span
            key={k}
            className="h-1.5 w-5 rounded-full transition-colors duration-200"
            style={{ background: k <= s ? "var(--brand-2)" : "var(--muted)" }}
          />
        ))}
      </div>
    </>
  );
}

/* =====================================================================
 * HTML to DOM
 * ===================================================================== */

const HTML_CODE = HTML_LINES.join("\n");
const HTML_ENDS = HTML_LINES.reduce<number[]>((acc, line) => {
  acc.push((acc.at(-1) ?? -1) + line.length + 1);
  return acc;
}, []);

function DomTree({
  on,
  selected,
  onSelect,
}: {
  on: Record<DomId, number>;
  selected: DomId | null;
  onSelect: (id: DomId) => void;
}) {
  return (
    <svg
      viewBox="0 0 240 120"
      className="h-full max-h-28 w-full"
      role="group"
      aria-label="DOM tree: div contains h2 and p"
    >
      {DOM_NODES.filter((n) => n.parent).map((n) => {
        const parent = DOM_NODES.find((d) => d.id === n.parent)!;
        return (
          <path
            key={n.id}
            d={`M${parent.at[0]} ${parent.at[1] + 13}L${n.at[0]} ${n.at[1] - 13}`}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - on[n.id]}
            strokeWidth={selected === n.id || selected === parent.id ? 2 : 1.25}
            fill="none"
            style={{
              stroke:
                selected === n.id
                  ? "var(--brand-2)"
                  : "color-mix(in srgb, var(--foreground) 25%, transparent)",
            }}
          />
        );
      })}
      {DOM_NODES.map((n) => {
        const t = on[n.id];
        const sel = selected === n.id;
        return (
          <g
            key={n.id}
            className="mm-node"
            role="button"
            tabIndex={t > 0.7 ? 0 : -1}
            aria-pressed={sel}
            aria-label={`${n.tag} element`}
            onClick={() => onSelect(n.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(n.id);
              }
            }}
            style={{
              opacity: clamp(t * 1.6),
              pointerEvents: t > 0.7 ? "auto" : "none",
              transform: `translate(${n.at[0]}px, ${n.at[1]}px) scale(${0.6 + 0.4 * easeOutBack(t)})`,
            }}
          >
            <rect
              x={-30}
              y={-13}
              width={60}
              height={26}
              rx={9}
              className="mm-node__box"
              style={{
                fill: sel ? "var(--brand-2)" : "var(--card)",
                stroke: sel ? "var(--brand-2)" : "var(--border)",
              }}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11.5}
              fontFamily="var(--font-mono)"
              style={{ fill: sel ? "#fff" : "var(--foreground)", pointerEvents: "none" }}
            >
              {n.tag}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Code, DOM tree and rendered page, linked: select any one and the other two light up. */
export function HtmlDomVisualizer({ p }: { p: number }) {
  const [picked, setPicked] = useState<DomId | null>(null);
  const chars = Math.floor(HTML_CODE.length * ease(seg(p, 0, 0.4)));
  const on: Record<DomId, number> = {
    div: ease(seg(chars, HTML_ENDS[0] - 4, HTML_ENDS[0] + 8)),
    h2: ease(seg(chars, HTML_ENDS[1] - 4, HTML_ENDS[1] + 8)),
    p: ease(seg(chars, HTML_ENDS[2] - 4, HTML_ENDS[2] + 8)),
  };
  const auto: DomId | null =
    p < 0.52 ? null : p < 0.66 ? "div" : p < 0.8 ? "h2" : p < 0.93 ? "p" : "div";
  const selected = picked ?? auto;
  const node = DOM_NODES.find((n) => n.id === selected);
  const ring = (id: DomId): CSSProperties =>
    selected === id
      ? { outline: "2px dashed var(--brand-2)", outlineOffset: 3, borderRadius: 4 }
      : {};

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-2.5 @xl:grid-cols-2">
        <Code
          code={HTML_CODE}
          chars={chars}
          lang="html"
          active={node?.lines}
          className="self-start"
        />
        <div className="grid min-h-0 min-w-0 grid-cols-2 gap-2.5 @xl:grid-cols-1 @xl:grid-rows-[auto_1fr]">
          <div className="min-h-0 rounded-lg border bg-muted/40 p-1.5">
            <p className="px-1 text-[10px] text-muted-foreground">DOM tree</p>
            <DomTree on={on} selected={selected} onSelect={setPicked} />
          </div>
          <div className="min-h-0 rounded-lg border bg-muted/40 p-1.5">
            <p className="px-1 text-[10px] text-muted-foreground">Browser preview</p>
            <div
              className="mt-1 rounded-md border bg-[#fbfbfd] p-3 text-slate-900"
              style={{ minHeight: "3.5rem", ...ring("div") }}
            >
              <h2 className="text-base font-bold" style={{ opacity: on.h2, ...ring("h2") }}>
                Hello World
              </h2>
              <p className="mt-1 text-xs" style={{ opacity: on.p, ...ring("p") }}>
                My first webpage
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="rounded-lg bg-foreground px-3 py-2 text-center text-[11px] text-background @md:text-xs @xl:text-sm"
        aria-live="polite"
      >
        {node
          ? `${node.tag}: ${node.note}`
          : "Each tag in the code becomes a node in the DOM tree."}
      </div>
    </>
  );
}

/* =====================================================================
 * CSS to style
 * ===================================================================== */

const CSS_CODE = CSS_LINES.join("\n");

/** Each declaration is highlighted for exactly the stretch where its effect is animating. */
export function CssStyleVisualizer({ p }: { p: number }) {
  const windows: [number, number][] = [
    [0.0, 0.06],
    [0.08, 0.18],
    [0.34, 0.42],
    [0.58, 0.66],
    [0.84, 0.88],
  ];
  let chars = 0;
  CSS_LINES.forEach((line, k) => {
    chars += (line.length + 1) * seg(p, windows[k][0], windows[k][1]);
  });
  const bg = ease(seg(p, 0.2, 0.34));
  const pad = ease(seg(p, 0.44, 0.58));
  const rad = ease(seg(p, 0.68, 0.84));
  const active: CssProp | null =
    p >= 0.1 && p < 0.36
      ? "background"
      : p >= 0.36 && p < 0.62
        ? "padding"
        : p >= 0.62 && p < 0.88
          ? "radius"
          : null;
  const line =
    active === "background" ? 2 : active === "padding" ? 3 : active === "radius" ? 4 : undefined;
  const note = active ? CSS_NOTES[active] : null;

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-2.5 @xl:grid-cols-2">
        <Code
          code={CSS_CODE}
          chars={Math.floor(chars)}
          lang="css"
          active={line}
          className="self-start"
        />
        <div className="min-h-0 rounded-lg border bg-muted/40 p-1.5">
          <p className="px-1 text-[10px] text-muted-foreground">
            Live preview (the card from the HTML)
          </p>
          <div className="mt-1 flex min-h-[6rem] @md:min-h-[8rem] items-center justify-center rounded-md border bg-[#fbfbfd] p-4 text-slate-900 @xl:min-h-[11rem]">
            <div
              style={{
                width: "min(100%, 15rem)",
                background: `rgb(238 242 255 / ${bg})`,
                padding: `${pad * 24}px`,
                borderRadius: `${rad * 16}px`,
                border: "1px dashed #cbd5e1",
              }}
            >
              <div
                style={
                  active === "padding"
                    ? { outline: "1px dashed var(--brand-2)", outlineOffset: 0 }
                    : undefined
                }
              >
                <h2 className="text-base font-bold">Hello World</h2>
                <p className="mt-1 text-xs">My first webpage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="flex min-h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-center text-[11px] text-background @md:text-xs @xl:text-sm"
        aria-live="polite"
      >
        {note ? (
          <>
            <span className="font-mono font-semibold">{note.name}</span>
            <span>{note.text}</span>
          </>
        ) : p >= 0.88 ? (
          "Three declarations turned plain markup into a styled card."
        ) : (
          "Without CSS the card is just boxed text."
        )}
      </div>
    </>
  );
}

/* =====================================================================
 * Scenes
 * ===================================================================== */

function SceneBody({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Shell>
      <Heading title={title} aside={aside} />
      {children}
    </Shell>
  );
}

/** Stage 5 (Learn): the subject picks the teaching visual. Python is the default story. */
export function LoopScene({ p, subject }: { p: number; subject: Subject }) {
  if (subject === "html")
    return (
      <SceneBody title="HTML becomes a DOM tree" aside={<Chip>Illustrative · click a node</Chip>}>
        <HtmlDomVisualizer p={p} />
      </SceneBody>
    );
  if (subject === "css")
    return (
      <SceneBody title="CSS restyles the card" aside={<Chip>Illustrative</Chip>}>
        <CssStyleVisualizer p={p} />
      </SceneBody>
    );
  const step = Math.min(8, Math.max(1, Math.floor(seg(p, 0.14, 0.97) * 8) + 1));
  return (
    <SceneBody title="Loops: one lap at a time" aside={<Chip>Step {step}/8 · source page 2</Chip>}>
      <PythonExecutionVisualizer p={p} />
    </SceneBody>
  );
}

/** Stage 6 (Web): HTML then CSS, with chips to pin either one. */
export function WebScene({ p }: { p: number }) {
  const [pin, setPin] = useState<"html" | "css" | null>(null);
  const which = pin ?? (p < 0.5 ? "html" : "css");
  const sub = pin ? p : p < 0.5 ? p * 2 : (p - 0.5) * 2;
  const chip = (id: "html" | "css", label: string) => (
    <button
      key={id}
      type="button"
      aria-pressed={which === id}
      onClick={() => setPin(pin === id ? null : id)}
      className={cn(
        "min-h-8 rounded-full border px-3 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        which === id
          ? "border-transparent text-white brand-fill"
          : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
  return (
    <SceneBody
      title={which === "html" ? "Markup becomes structure" : "Styles become pixels"}
      aside={
        <span className="flex gap-1">
          {chip("html", "HTML")}
          {chip("css", "CSS")}
        </span>
      }
    >
      {which === "html" ? <HtmlDomVisualizer p={sub} /> : <CssStyleVisualizer p={sub} />}
    </SceneBody>
  );
}
