import {
  ANALOGY_ICONS,
  lessonEnvelopeSchema,
  sceneSchema,
  type LessonScript,
  type Scene,
} from "@/lib/schemas/lesson";

export interface ValidateOptions {
  validPages: ReadonlySet<number>;
  /** Exercises that really exist for this topic, in the order they should appear. */
  exerciseIds: string[];
  exercisePrompts: Record<string, string>;
}

export interface ValidatedScript {
  script: LessonScript;
  dropped: { index: number; reason: string }[];
}

const MAX_NARRATION = 600;

/** Icon names models tend to reach for that aren't in the library, mapped to the closest one that is. */
type IconName = (typeof ANALOGY_ICONS)[number];
const ICON_SYNONYMS: Record<string, IconName> = {
  loop: "repeat",
  cycle: "repeat",
  refresh: "repeat",
  sync: "repeat",
  rotate: "repeat",
  infinity: "repeat",
  array: "list",
  number: "list",
  numbers: "list",
  brackets: "code",
  bracket: "code",
  terminal: "code",
  function: "code",
  braces: "code",
  box: "package",
  variable: "package",
  container: "package",
  archive: "package",
  cube: "package",
  index: "key",
  lock: "key",
  pointer: "target",
  arrow: "target",
  bullseye: "target",
  timer: "clock",
  time: "clock",
  hourglass: "clock",
  calendar: "clock",
  error: "bug",
  warning: "bug",
  alert: "bug",
  idea: "lightbulb",
  light: "lightbulb",
  bulb: "lightbulb",
  star: "rocket",
  launch: "rocket",
  stack: "layers",
  layer: "layers",
  slice: "layers",
  grid: "layers",
  speed: "zap",
  lightning: "zap",
  bolt: "zap",
  flash: "zap",
  library: "book",
  document: "book",
  text: "book",
  page: "book",
  path: "map",
  route: "map",
  compass: "map",
  cart: "shopping-cart",
  basket: "shopping-cart",
  shop: "shopping-cart",
  piece: "puzzle",
  piano: "music",
  note: "music",
  house: "building",
  home: "building",
  ticketing: "ticket",
};

/** Icons are decorative, so an unknown name is repaired (never worth dropping a scene over). */
function fixIcon(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const name = value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-");
  if ((ANALOGY_ICONS as readonly string[]).includes(name)) return name;
  return ICON_SYNONYMS[name] ?? ICON_SYNONYMS[name.replace(/-/g, "")] ?? "puzzle";
}

/** Light, safe repairs for near-misses the model makes often; anything else is left for validation to reject. */
function repairScene(raw: Record<string, unknown>): Record<string, unknown> {
  const scene = { ...raw };
  // Audio is attached by the server after recording; anything the model wrote there is made up.
  delete scene.audio;
  if (Array.isArray(scene.emphasis)) {
    // Keep only words that really occur in this scene's narration, so a stray word can never fire a false beat.
    const spoken = typeof scene.narration === "string" ? scene.narration.toLowerCase() : "";
    scene.emphasis = scene.emphasis
      .filter((w: unknown) => typeof w === "string" && spoken.includes(w.toLowerCase()))
      .slice(0, 3);
  }
  if (typeof scene.narration === "string" && scene.narration.length > MAX_NARRATION) {
    scene.narration = scene.narration.slice(0, MAX_NARRATION).replace(/\s+\S*$/, "");
  }
  if (typeof scene.seconds === "number") scene.seconds = Math.min(40, Math.max(4, scene.seconds));
  if ("icon" in scene) scene.icon = fixIcon(scene.icon);
  if (scene.type === "KeyTerms" && Array.isArray(scene.terms)) {
    scene.terms = scene.terms.map((t: Record<string, unknown>) => ({
      ...t,
      icon: fixIcon(t.icon),
    }));
  }
  if (scene.type === "Bento" && Array.isArray(scene.cards)) {
    scene.cards = scene.cards.map((rawCard: Record<string, unknown>) => {
      const card: Record<string, unknown> = { ...rawCard, icon: fixIcon(rawCard.icon) };
      const stat = card.stat as { prefix?: string; suffix?: string } | undefined;
      if (!stat) return card;
      return {
        ...card,
        stat: {
          ...stat,
          prefix: stat.prefix && stat.prefix.length <= 3 ? stat.prefix : undefined,
          suffix: stat.suffix && stat.suffix.length <= 4 ? stat.suffix : undefined,
        },
      };
    });
  }
  return scene;
}

/**
 * Validates scene by scene so one bad scene never costs the whole lesson. A scene is dropped (and reported)
 * when it doesn't match its type, cites a page that doesn't exist, or points a Checkpoint at an unknown
 * exercise. The lesson only fails if fewer than 3 good scenes remain.
 */
export function validateScript(
  raw: unknown,
  opts: ValidateOptions,
  directedBy?: "groq" | "claude" | "gemini",
): ValidatedScript {
  const envelope = lessonEnvelopeSchema.parse(raw);
  const dropped: ValidatedScript["dropped"] = [];
  const scenes: Scene[] = [];
  envelope.scenes.forEach((candidate, index) => {
    const parsed = sceneSchema.safeParse(repairScene(candidate));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      dropped.push({
        index,
        reason: `invalid scene (${issue.path.join(".") || "type"}: ${issue.message})`,
      });
      return;
    }
    const scene = parsed.data;
    if (!opts.validPages.has(scene.page)) {
      dropped.push({ index, reason: `page ${scene.page} does not exist` });
      return;
    }
    if (scene.type === "Checkpoint" && !opts.exerciseIds.includes(scene.exerciseId)) {
      dropped.push({ index, reason: `exercise ${scene.exerciseId} does not exist` });
      return;
    }
    scenes.push(scene);
  });

  // A topic with exercises always ends on a Checkpoint so the IDE has somewhere to open.
  if (opts.exerciseIds.length > 0 && !scenes.some((s) => s.type === "Checkpoint")) {
    const id = opts.exerciseIds[0];
    const last = scenes[scenes.length - 1];
    scenes.push({
      type: "Checkpoint",
      narration: "Your turn. Try the practice exercise now. I will be right here if you get stuck.",
      seconds: 6,
      page: last?.page ?? [...opts.validPages][0],
      exerciseId: id,
      prompt: opts.exercisePrompts[id] ?? "Try the exercise.",
    });
  }
  if (scenes.length < 3)
    throw new Error(
      `Too few valid scenes remain after validation (${dropped
        .slice(0, 4)
        .map((d) => `#${d.index}: ${d.reason}`)
        .join("; ")}).`,
    );
  return { script: { title: envelope.title, directedBy, scenes }, dropped };
}

/** A lesson is good enough to ship when it kept nearly all its scenes. */
export const MIN_SCENES = 6;
export const MAX_DROPPED = 1;
export function isSolid(result: ValidatedScript): boolean {
  return result.script.scenes.length >= MIN_SCENES && result.dropped.length <= MAX_DROPPED;
}
