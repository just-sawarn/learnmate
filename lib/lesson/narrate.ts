import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { elevenLabsVoiceTag } from "@/lib/ai/elevenlabs";
import { synthesizeNarration } from "@/lib/ai/tts";
import { alignWords, analyze } from "@/lib/audio/align";
import { lessonScriptSchema, type LessonScript } from "@/lib/schemas/lesson";
import type { Database, Json } from "@/lib/supabase/types";

type Supabase = SupabaseClient<Database>;

export const NARRATION_BUCKET = "narration";
// ElevenLabs plans allow only a few simultaneous requests.
const CONCURRENCY = 2;

export interface NarrationResult {
  script: LessonScript;
  /** Scenes that now have a recording. */
  recorded: number;
  /** Scenes that could not be recorded; the player falls back to the browser's voice for these. */
  failed: number;
  /** The voice used for new recordings. */
  voice: string;
}

export class LessonMissingError extends Error {}

/** Per-word start times measured from the recording, or undefined if the audio can't be analysed. */
export function wordTimes(narration: string, wav: Buffer): number[] | undefined {
  const analysis = analyze(wav);
  return analysis
    ? alignWords(narration, analysis).map((t) => Math.round(t * 1000) / 1000)
    : undefined;
}

/** The voice new recordings are made with: ElevenLabs when configured, otherwise Gemini. */
export function wantedVoice(): string {
  return elevenLabsVoiceTag() ?? "gemini";
}

export function narrationPath(
  userId: string,
  text: string,
  uiLang: string,
  voice = wantedVoice(),
): string {
  return `${userId}/${createHash("sha1").update(`${voice}|${uiLang}|${text}`).digest("hex")}.wav`;
}

/** A scene needs recording if it has no audio, or ElevenLabs is configured and its audio is in another voice. */
export function needsRecording(scene: { audio?: { voice?: string } }): boolean {
  if (!scene.audio) return true;
  return elevenLabsVoiceTag() !== null && scene.audio.voice !== elevenLabsVoiceTag();
}

/** Records any scene narration that is missing, stores it privately, and saves the lengths in the cached lesson. */
export async function recordNarration(
  supabase: Supabase,
  userId: string,
  topicId: string,
  uiLang: "en" | "hi",
): Promise<NarrationResult> {
  const { data: row } = await supabase
    .from("lessons")
    .select("id,script")
    .eq("topic_id", topicId)
    .eq("ui_lang", uiLang)
    .maybeSingle();
  const parsed = row ? lessonScriptSchema.safeParse(row.script) : null;
  if (!row || !parsed?.success) throw new LessonMissingError();

  const script = parsed.data;
  // Recordings made before word timing existed get it now, from the stored audio (no new speech is generated).
  let backfilled = false;
  await Promise.all(
    script.scenes.map(async (scene, index) => {
      if (!scene.audio || scene.audio.words) return;
      const { data } = await supabase.storage.from(NARRATION_BUCKET).download(scene.audio.path);
      if (!data) return;
      const words = wordTimes(scene.narration, Buffer.from(await data.arrayBuffer()));
      if (!words) return;
      script.scenes[index] = { ...scene, audio: { ...scene.audio, words } };
      backfilled = true;
    }),
  );
  const saveScript = () =>
    supabase
      .from("lessons")
      .update({ script: script as unknown as Json })
      .eq("id", row.id);

  const voice = wantedVoice();
  const todo = script.scenes
    .map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => needsRecording(scene));
  const recordOne = async ({ scene, index }: (typeof todo)[number]) => {
    // Upgrading a recording to the new voice never falls back to a different one; a missing recording may.
    const rec = await synthesizeNarration(scene.narration, { allowFallback: !scene.audio });
    const { wav, seconds } = rec;
    const path = narrationPath(userId, scene.narration, uiLang, rec.voice);
    const { error } = await supabase.storage
      .from(NARRATION_BUCKET)
      .upload(path, wav, { contentType: "audio/wav", upsert: true });
    if (error) throw error;
    script.scenes[index] = {
      ...scene,
      audio: {
        path,
        seconds,
        voice: rec.voice,
        words: rec.words ?? wordTimes(scene.narration, wav),
      },
    };
  };

  // Do the first scene alone: if recording or storing it fails (e.g. the bucket isn't set up), stop before
  // paying for the other scenes. The player then uses the browser's voice for the whole lesson.
  let failed = 0;
  const [first, ...rest] = todo;
  if (first) {
    try {
      await recordOne(first);
    } catch (error) {
      console.error(
        "[narration] first scene failed, skipping the rest:",
        error instanceof Error ? error.message : error,
      );
      if (backfilled) await saveScript();
      return {
        script,
        recorded: script.scenes.filter((s) => s.audio).length,
        failed: todo.length,
        voice,
      };
    }
  }
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < rest.length) {
        const job = rest[next++];
        try {
          await recordOne(job);
        } catch (error) {
          failed++;
          console.error(
            "[narration] scene",
            job.index,
            "failed:",
            error instanceof Error ? error.message : error,
          );
        }
      }
    }),
  );

  const recorded = script.scenes.filter((s) => s.audio).length;
  if (todo.length > failed || backfilled) await saveScript();
  return { script, recorded, failed: script.scenes.length - recorded, voice };
}
