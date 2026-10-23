import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3-flash-preview"),
  GEMINI_FALLBACK_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5-5"),
  /** The live tutor (Guru) talks to the student, so it gets the stronger model even when generation uses a fast one. */
  ANTHROPIC_TUTOR_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
  ANTHROPIC_FALLBACK_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
  /** Narration voice. Optional: without a key the lesson voice falls back to Gemini, then to the browser's voice. */
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_VOICE_ID: z.string().min(1).optional(),
  /** multilingual_v2 is the most natural and handles Hindi; flash_v2_5 is faster and cheaper. */
  ELEVENLABS_MODEL: z.string().min(1).default("eleven_multilingual_v2"),
  GEMINI_TTS_MODEL: z.string().min(1).default("gemini-3.8-flash-tts"),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
  /** Writes lesson scripts, which need a bigger model than the instant assists. */
  GROQ_LESSON_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
  ONLINECOMPILER_API_KEY: z.string().min(1),
  ONLINECOMPILER_URL: z.string().url().default("https://api.onlinecompiler.io"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function parse<T extends z.ZodType>(schema: T, source: Record<string, unknown>): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Invalid environment: ${missing}. Copy .env.example to .env.local and fill these in.`,
    );
  }
  return result.data;
}

/** Public values must be referenced statically so Next.js can inline them into the client bundle. */
export function publicEnv(): PublicEnv {
  return parse(publicSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

let cachedServer: ServerEnv | undefined;

/** Server-only secrets. Throws a message naming every missing variable. */
export function serverEnv(): ServerEnv {
  cachedServer ??= parse(serverSchema, {
    ...process.env,
    ONLINECOMPILER_URL: process.env.ONLINECOMPILER_URL || undefined,
  });
  return cachedServer;
}

/** Just the service-role key, so scripts and tests don't need every AI provider key configured. */
export function serviceRoleKey(): string {
  return parse(serverSchema.pick({ SUPABASE_SERVICE_ROLE_KEY: true }), {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).SUPABASE_SERVICE_ROLE_KEY;
}
