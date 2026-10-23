import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { wordTimesFromAlignment } from "@/lib/ai/elevenlabs";
import { wavSeconds } from "@/lib/audio/wav";

const text = "Hello big world";
const alignment = (t: string, step = 0.1) => ({
  characters: t.split(""),
  character_start_times_seconds: t.split("").map((_, i) => i * step),
  character_end_times_seconds: t.split("").map((_, i) => (i + 1) * step),
});

describe("wordTimesFromAlignment", () => {
  it("returns the start time of each word from per-character timing", () => {
    expect(wordTimesFromAlignment(text, alignment(text))).toEqual([0, 0.6, 1]);
  });
  it("copes with repeated spaces and punctuation", () => {
    const t = "Hi,  you.";
    expect(wordTimesFromAlignment(t, alignment(t))).toEqual([0, 0.5]);
  });
  it("returns undefined when the characters don't match the text", () => {
    expect(wordTimesFromAlignment(text, alignment("Hello big word"))).toBeUndefined();
  });
});

describe("narration voice choice", () => {
  const original = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
    process.env.GEMINI_API_KEY = "x";
    process.env.ANTHROPIC_API_KEY = "x";
    process.env.GROQ_API_KEY = "x";
    process.env.ONLINECOMPILER_API_KEY = "x";
  });
  afterEach(() => {
    process.env = { ...original };
    vi.unstubAllGlobals();
  });

  it("records with ElevenLabs when configured, sends the key and voice, and returns a WAV with word times", async () => {
    process.env.ELEVENLABS_API_KEY = "key-123";
    process.env.ELEVENLABS_VOICE_ID = "voice-9";
    const pcm = Buffer.alloc(24000 * 2 * 2); // two seconds of 24 kHz 16-bit silence
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ audio_base64: pcm.toString("base64"), alignment: alignment(text) }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { synthesizeNarration } = await import("@/lib/ai/tts");
    const rec = await synthesizeNarration(text);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/text-to-speech/voice-9/with-timestamps");
    expect(url).toContain("output_format=pcm_24000");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("key-123");
    expect(JSON.parse(init.body as string).text).toBe(text);
    expect(rec.voice).toBe("elevenlabs:voice-9");
    expect(rec.words).toEqual([0, 0.6, 1]);
    expect(wavSeconds(rec.wav)).toBeCloseTo(2, 2);
  });

  it("does not retry a bad key, and does not fall back when only upgrading a recording", async () => {
    process.env.ELEVENLABS_API_KEY = "bad";
    process.env.ELEVENLABS_VOICE_ID = "voice-9";
    const fetchMock = vi.fn(async () => new Response("unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const { synthesizeNarration } = await import("@/lib/ai/tts");
    await expect(synthesizeNarration(text, { allowFallback: false })).rejects.toThrow(
      /ElevenLabs failed: HTTP 401/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tags recordings by voice, so changing the voice upgrades them", async () => {
    process.env.ELEVENLABS_API_KEY = "k";
    process.env.ELEVENLABS_VOICE_ID = "voice-9";
    const { needsRecording, narrationPath } = await import("@/lib/lesson/narrate");
    expect(needsRecording({})).toBe(true);
    expect(needsRecording({ audio: { voice: "gemini" } })).toBe(true);
    expect(needsRecording({ audio: {} })).toBe(true);
    expect(needsRecording({ audio: { voice: "elevenlabs:voice-9" } })).toBe(false);
    expect(narrationPath("u", "t", "en", "gemini")).not.toBe(
      narrationPath("u", "t", "en", "elevenlabs:voice-9"),
    );
  });

  it("leaves existing recordings alone when ElevenLabs is not configured", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
    const { needsRecording } = await import("@/lib/lesson/narrate");
    expect(needsRecording({ audio: { voice: "gemini" } })).toBe(false);
    expect(needsRecording({ audio: {} })).toBe(false);
    expect(needsRecording({})).toBe(true);
  });
});

describe("a rejected voice", () => {
  it("is skipped for a while after a permanent rejection instead of being called for every scene", async () => {
    vi.resetModules();
    Object.assign(process.env, {
      SUPABASE_SERVICE_ROLE_KEY: "x",
      GEMINI_API_KEY: "x",
      ANTHROPIC_API_KEY: "x",
      GROQ_API_KEY: "x",
      ONLINECOMPILER_API_KEY: "x",
      ELEVENLABS_API_KEY: "k",
      ELEVENLABS_VOICE_ID: "library-voice",
    });
    const fetchMock = vi.fn(
      async () => new Response('{"detail":{"code":"paid_plan_required"}}', { status: 402 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { synthesizeWithElevenLabs } = await import("@/lib/ai/elevenlabs");
    await expect(synthesizeWithElevenLabs("one")).rejects.toThrow(/402/);
    await expect(synthesizeWithElevenLabs("two")).rejects.toThrow(/skipped/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
