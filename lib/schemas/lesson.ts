import { z } from "zod";

export const ANALOGY_ICONS = [
  "repeat",
  "package",
  "list",
  "key",
  "map",
  "clock",
  "ticket",
  "building",
  "music",
  "shopping-cart",
  "code",
  "bug",
  "rocket",
  "lightbulb",
  "puzzle",
  "layers",
  "target",
  "zap",
  "book",
] as const;
const iconSchema = z.enum(ANALOGY_ICONS);

const base = {
  narration: z.string().min(10).max(600),
  seconds: z.number().min(4).max(40),
  page: z.number().int().positive(),
  /** How the scene should feel: calm for explanation, punchy for recaps and transitions. */
  energy: z.enum(["calm", "balanced", "punchy"]).optional(),
  /** Words from this scene's narration that deserve a visual punch (camera push, caption highlight). */
  emphasis: z.array(z.string().max(30)).max(3).optional(),
  /** Recorded narration for this scene (set by /api/narration, never by the model). */
  audio: z
    .object({
      path: z.string(),
      seconds: z.number().positive(),
      /** Who recorded it ("elevenlabs:<voice>" or "gemini"), so a recording can be upgraded when the voice changes. */
      voice: z.string().max(80).optional(),
      /** Start time (seconds) of each narration word, measured from the recording's pauses. */
      words: z.array(z.number()).optional(),
    })
    .optional(),
};

export const traceStepSchema = z.object({
  line: z.number().int().positive(),
  vars: z.record(z.string(), z.string()),
  output: z.string(),
});
export type TraceStepData = z.infer<typeof traceStepSchema>;

export const sceneSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TitleCard"),
    ...base,
    title: z.string().max(80),
    hook: z.string().max(160),
  }),
  z.object({
    type: z.literal("CodeReveal"),
    ...base,
    code: z.string().min(1).max(1200),
    language: z.string().default("python"),
    highlightLines: z.array(z.number().int().positive()).max(6).default([]),
    caption: z.string().max(140).optional(),
  }),
  z.object({
    type: z.literal("VariableTracker"),
    ...base,
    /** Python only. The steps are filled in by really executing this code, never written by the model. */
    code: z.string().min(1).max(800),
    steps: z.array(traceStepSchema).optional(),
  }),
  z.object({
    type: z.literal("FlowDiagram"),
    ...base,
    variant: z.enum(["loop", "branch"]),
    labels: z.object({
      start: z.string().max(30).default("Start"),
      init: z.string().max(40),
      condition: z.string().max(40),
      body: z.string().max(40),
      update: z.string().max(40),
      alternative: z.string().max(40).default("Do something else"),
      exit: z.string().max(30).default("Done"),
    }),
  }),
  z.object({
    type: z.literal("Analogy"),
    ...base,
    icon: iconSchema,
    concept: z.string().max(60),
    realLife: z.string().max(80),
    bullets: z.array(z.string().max(100)).min(2).max(4),
  }),
  z.object({
    type: z.literal("KeyTerms"),
    ...base,
    /** Words the topic is built from; icon tiles fly in and become kinetic typography. */
    terms: z
      .array(z.object({ label: z.string().max(18), icon: iconSchema }))
      .min(3)
      .max(8),
  }),
  z.object({
    type: z.literal("Bento"),
    ...base,
    /** An overview of the topic's parts as cards that assemble into a bento grid. */
    cards: z
      .array(
        z.object({
          title: z.string().max(28),
          body: z.string().max(90).optional(),
          stat: z
            .object({
              value: z.number(),
              prefix: z.string().max(3).optional(),
              suffix: z.string().max(4).optional(),
            })
            .optional(),
          tone: z.enum(["light", "dark", "accent"]),
          icon: iconSchema,
        }),
      )
      .min(3)
      .max(5),
  }),
  z.object({
    type: z.literal("ArrayViz"),
    ...base,
    /** A list/array as stacking blocks. iterate: a pointer walks it. index: one slot is picked out. append: a block drops on the end. */
    name: z.string().max(20),
    items: z.array(z.string().max(8)).min(2).max(8),
    mode: z.enum(["iterate", "index", "append"]),
    focusIndex: z.number().int().min(-8).max(7).optional(),
    appendValue: z.string().max(8).optional(),
  }),
  z.object({
    type: z.literal("Steps"),
    ...base,
    /** A process or sequence: numbered steps that connect one after another as each is spoken. */
    steps: z
      .array(z.object({ label: z.string().max(28), detail: z.string().max(80).optional() }))
      .min(3)
      .max(6),
  }),
  z.object({
    type: z.literal("Compare"),
    ...base,
    /** Two things side by side, point by point. */
    left: z.object({
      title: z.string().max(30),
      points: z.array(z.string().max(60)).min(2).max(4),
    }),
    right: z.object({
      title: z.string().max(30),
      points: z.array(z.string().max(60)).min(2).max(4),
    }),
  }),
  z.object({
    type: z.literal("RepeatBurst"),
    ...base,
    /** "Write it once, run it N times": a mosaic of tiles zooms out as a counter climbs. */
    label: z.string().max(60),
    count: z.number().int().min(10).max(1000),
    icon: iconSchema,
  }),
  z.object({
    type: z.literal("Checkpoint"),
    ...base,
    exerciseId: z.string(),
    prompt: z.string().max(300),
  }),
]);
export type Scene = z.infer<typeof sceneSchema>;
export type SceneType = Scene["type"];

export const lessonScriptSchema = z.object({
  title: z.string().max(100),
  /** Which model directed the lesson; set by the server, never by the model. */
  directedBy: z.enum(["groq", "claude", "gemini"]).optional(),
  scenes: z.array(sceneSchema).min(3).max(16),
});
export type LessonScript = z.infer<typeof lessonScriptSchema>;

/**
 * What we accept from the model before checking scenes one by one. Each scene is validated against
 * `sceneSchema` separately so a single malformed scene is dropped instead of failing the lesson.
 */
export const lessonEnvelopeSchema = z.object({
  title: z.string().max(200),
  directedBy: z.enum(["groq", "claude", "gemini"]).optional(),
  scenes: z.array(z.record(z.string(), z.unknown())).min(3).max(20),
});

/** Animation tempo for a scene's energy. */
export const ENERGY_TEMPO = { calm: 0.85, balanced: 1, punchy: 1.25 } as const;
