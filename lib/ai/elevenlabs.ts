import { pcmToWav, wavSeconds } from "@/lib/audio/wav";
import { serverEnv } from "@/lib/env";

const API = "https://api.elevenlabs.io/v1";
const SAMPLE_RATE = 24000;

export interface ElevenAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface Recording {
  wav: Buffer;
  seconds: number;
  /** Start time of each whitespace-separated word, when the provider reports timing. */
  words?: number[];
  /** Who recorded it, e.g. "elevenlabs:abc123" or "gemini". */
  voice: string;
}

export function elevenLabsConfigured(): boolean {
  const env = serverEnv();
  return !!env.ELEVENLABS_API_KEY && !!env.ELEVENLABS_VOICE_ID;
}

/** The tag stored with a recording; changes when the voice does, so old recordings can be upgraded. */
export function elevenLabsVoiceTag(): string | null {
  const env = serverEnv();
  return elevenLabsConfigured() ? `elevenlabs:${env.ELEVENLABS_VOICE_ID}` : null;
}

/**
 * Start time of every whitespace-separated word, read from ElevenLabs' per-character timing. Exact, because the
 * timing comes from the same synthesis as the audio. Returns undefined if the characters don't line up with the text.
 */
export function wordTimesFromAlignment(text: string, a: ElevenAlignment): number[] | undefined {
  if (!a?.characters || a.characters.join("") !== text) return undefined;
  const starts = a.character_start_times_seconds;
  if (starts.length !== text.length) return undefined;
  const times: number[] = [];
  const re = /\S+/g;
  for (let m = re.exec(text); m; m = re.exec(text))
    times.push(Math.round(starts[m.index] * 1000) / 1000);
  return times;
}

/** After a rejection that won't fix itself (bad key, voice not allowed on the plan, out of credits), skip ElevenLabs briefly. */
const BLOCK_MS = 10 * 60_000;
let blocked: { until: number; reason: string } | null = null;

async function request(text: string, signal: AbortSignal): Promise<Response> {
  const env = serverEnv();
  return fetch(
    `${API}/text-to-speech/${encodeURIComponent(env.ELEVENLABS_VOICE_ID!)}/with-timestamps?output_format=pcm_${SAMPLE_RATE}`,
    {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: env.ELEVENLABS_MODEL,
        // A warm, steady teacher: fairly stable, a touch of expressiveness.
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
      signal,
    },
  );
}

/**
 * Records one scene's narration with ElevenLabs: 24 kHz PCM wrapped as a WAV (the format the rest of the pipeline and
 * the storage bucket already use), plus exact word timing for the animation. Retries once on rate limits and 5xx.
 */
export async function synthesizeWithElevenLabs(text: string): Promise<Recording> {
  if (blocked && Date.now() < blocked.until)
    throw new Error(`ElevenLabs skipped (rejected recently: ${blocked.reason})`);
  let lastError = "no response";
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await request(text, controller.signal);
      if (res.ok) {
        const data = (await res.json()) as { audio_base64?: string; alignment?: ElevenAlignment };
        if (!data.audio_base64) throw new Error("ElevenLabs returned no audio");
        const wav = pcmToWav(Buffer.from(data.audio_base64, "base64"), SAMPLE_RATE);
        const seconds = wavSeconds(wav);
        if (!seconds || seconds < 0.3) throw new Error("ElevenLabs returned unusable audio");
        return {
          wav,
          seconds,
          words: data.alignment ? wordTimesFromAlignment(text, data.alignment) : undefined,
          voice: elevenLabsVoiceTag()!,
        };
      }
      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
      // 4xx other than a rate limit (bad key, unknown voice, out of credits) won't change on retry.
      if (res.status !== 429 && res.status < 500) {
        blocked = { until: Date.now() + BLOCK_MS, reason: lastError.slice(0, 160) };
        break;
      }
      await new Promise((r) => setTimeout(r, 1200));
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`ElevenLabs failed: ${lastError}`);
}
