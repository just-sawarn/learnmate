import { describe, expect, it } from "vitest";
import { sampleLoopsLesson } from "@/fixtures/sample-lesson";
import { layout, sceneIndexAt, sceneSeconds } from "@/lib/lesson/timing";
import { isSolid, validateScript } from "@/lib/lesson/validate";
import { lessonScriptSchema } from "@/lib/schemas/lesson";

const opts = {
  validPages: new Set(Array.from({ length: 16 }, (_, i) => i + 1)),
  exerciseIds: ["sample-sum-to-n"],
  exercisePrompts: { "sample-sum-to-n": "Write sum_to" },
};

describe("lesson script validation", () => {
  it("accepts a valid script and keeps every scene", () => {
    const { script, dropped } = validateScript(sampleLoopsLesson, opts);
    expect(script.scenes).toHaveLength(sampleLoopsLesson.scenes.length);
    expect(dropped).toEqual([]);
  });

  it("drops a scene whose page does not exist in the course", () => {
    const bad = structuredClone(sampleLoopsLesson);
    bad.scenes[1] = { ...bad.scenes[1], page: 99 };
    const { script, dropped } = validateScript(bad, opts);
    expect(script.scenes).toHaveLength(sampleLoopsLesson.scenes.length - 1);
    expect(dropped[0]).toMatchObject({ index: 1, reason: expect.stringContaining("page 99") });
  });

  it("drops a scene with an unknown type but keeps the rest", () => {
    const bad = structuredClone(sampleLoopsLesson) as unknown as { scenes: { type: string }[] };
    bad.scenes[0].type = "Fireworks";
    expect(lessonScriptSchema.safeParse(bad).success).toBe(false);
    const { script, dropped } = validateScript(bad, opts);
    expect(dropped[0]).toMatchObject({
      index: 0,
      reason: expect.stringContaining("invalid scene"),
    });
    expect(script.scenes).toHaveLength(sampleLoopsLesson.scenes.length - 1);
  });

  it("drops a scene missing its required page", () => {
    const bad = structuredClone(sampleLoopsLesson) as unknown as {
      scenes: Record<string, unknown>[];
    };
    delete bad.scenes[0].page;
    expect(lessonScriptSchema.safeParse(bad).success).toBe(false);
    expect(validateScript(bad, opts).dropped[0].reason).toContain("page");
  });

  it("repairs near-misses: an over-long stat prefix is removed instead of failing the lesson", () => {
    const lesson = structuredClone(sampleLoopsLesson);
    const bento = lesson.scenes.find((s) => s.type === "Bento");
    if (bento?.type === "Bento")
      bento.cards[1].stat = { value: 5, prefix: "about", suffix: "laps" };
    const { script, dropped } = validateScript(lesson, opts);
    expect(dropped).toEqual([]);
    const fixed = script.scenes.find((s) => s.type === "Bento");
    expect(fixed?.type === "Bento" && fixed.cards[1].stat?.prefix).toBeUndefined();
  });

  it("fails only when fewer than 3 good scenes remain", () => {
    const lesson = structuredClone(sampleLoopsLesson);
    lesson.scenes = lesson.scenes.map((s) => ({ ...s, page: 99 }));
    expect(() => validateScript(lesson, opts)).toThrow(/Too few/);
  });

  it("drops a Checkpoint pointing at an exercise that does not exist, then restores one that does", () => {
    const bad = structuredClone(sampleLoopsLesson);
    bad.scenes[bad.scenes.length - 1] = {
      ...bad.scenes[bad.scenes.length - 1],
      exerciseId: "ghost",
    } as never;
    const { script, dropped } = validateScript(bad, opts);
    expect(dropped.some((d) => d.reason.includes("ghost"))).toBe(true);
    const last = script.scenes[script.scenes.length - 1];
    expect(last.type).toBe("Checkpoint");
    expect(last.type === "Checkpoint" && last.exerciseId).toBe("sample-sum-to-n");
  });
});

describe("scene timing", () => {
  it("scales with narration length and never goes below the script's own seconds", () => {
    const short = sceneSeconds({ narration: "Short narration for a scene.", seconds: 8 });
    const long = sceneSeconds({ narration: Array(120).fill("word").join(" "), seconds: 6 });
    expect(short).toBe(8);
    expect(long).toBeGreaterThan(30); // 120 words at 3 a second is 40s of speech
  });

  it("lays scenes end to end and finds the scene at a frame", () => {
    const { timed, totalFrames } = layout(sampleLoopsLesson.scenes);
    expect(timed[0].from).toBe(0);
    expect(timed[1].from).toBe(timed[0].frames);
    expect(totalFrames).toBe(timed.reduce((n, t) => n + t.frames, 0));
    expect(sceneIndexAt(timed, timed[2].from + 1)).toBe(2);
  });
});

describe("icon repair and the solidity gate", () => {
  it("repairs an icon name that isn't in the library instead of dropping the scene", () => {
    const lesson = structuredClone(sampleLoopsLesson);
    const terms = lesson.scenes.find((s) => s.type === "KeyTerms");
    if (terms?.type === "KeyTerms") terms.terms[0].icon = "brackets" as never;
    const { script, dropped } = validateScript(lesson, opts);
    expect(dropped).toEqual([]);
    const fixed = script.scenes.find((s) => s.type === "KeyTerms");
    expect(fixed?.type === "KeyTerms" && fixed.terms[0].icon).toBe("code");
  });

  it("falls back to a neutral icon for names it can't place", () => {
    const lesson = structuredClone(sampleLoopsLesson);
    const analogy = lesson.scenes.find((s) => s.type === "Analogy");
    if (analogy?.type === "Analogy") analogy.icon = "zzz-unknown" as never;
    const fixed = validateScript(lesson, opts).script.scenes.find((s) => s.type === "Analogy");
    expect(fixed?.type === "Analogy" && fixed.icon).toBe("puzzle");
  });

  it("calls a lesson solid only if it kept nearly all its scenes", () => {
    const full = validateScript(sampleLoopsLesson, opts);
    expect(isSolid(full)).toBe(true);
    expect(
      isSolid({ script: { ...full.script, scenes: full.script.scenes.slice(0, 4) }, dropped: [] }),
    ).toBe(false);
    expect(
      isSolid({
        script: full.script,
        dropped: [
          { index: 0, reason: "x" },
          { index: 1, reason: "y" },
        ],
      }),
    ).toBe(false);
  });
});
