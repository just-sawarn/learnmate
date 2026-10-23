import type { Scene } from "@/lib/schemas/lesson";

export const FPS = 30;
// Roughly how fast the browser's built-in voices speak; recordings and live speech events replace this estimate.
const WORDS_PER_SECOND = 3;
/** Breathing room after the voice stops, so the last animation lands before the next scene. */
export const PAUSE_SECONDS = 0.9;
const MIN_SECONDS = 5;

type Timable = Pick<Scene, "narration" | "seconds" | "audio">;

/** How long the narration itself takes: the recording's real length, or an estimate from the word count. */
export function speechSeconds(scene: Timable): number {
  if (scene.audio) return scene.audio.seconds;
  const words = scene.narration.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(
    MIN_SECONDS - PAUSE_SECONDS,
    scene.seconds - PAUSE_SECONDS,
    words / WORDS_PER_SECOND,
  );
}

/** Scene length: the voice, then a short pause. With a recording this is exact, so animation matches speech. */
export function sceneSeconds(scene: Timable): number {
  return speechSeconds(scene) + PAUSE_SECONDS;
}

export interface TimedScene {
  scene: Scene;
  /** First frame of the scene on the lesson timeline. */
  from: number;
  frames: number;
  speechFrames: number;
  /** Frame at which each narration word is spoken, measured from the recording (absent for browser voice). */
  wordFrames?: number[];
}

export function layout(scenes: Scene[]): { timed: TimedScene[]; totalFrames: number } {
  let from = 0;
  const timed = scenes.map((scene) => {
    const frames = Math.round(sceneSeconds(scene) * FPS);
    const entry = {
      scene,
      from,
      frames,
      speechFrames: Math.round(speechSeconds(scene) * FPS),
      wordFrames: scene.audio?.words?.map((t) => t * FPS),
    };
    from += frames;
    return entry;
  });
  return { timed, totalFrames: from };
}

export function sceneIndexAt(timed: TimedScene[], frame: number): number {
  const i = timed.findIndex((t) => frame >= t.from && frame < t.from + t.frames);
  return i === -1 ? timed.length - 1 : i;
}
