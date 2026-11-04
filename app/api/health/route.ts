import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Which settings the server is missing, by name only (never values). Open this URL after deploying to see what to add. */
export async function GET() {
  const need = {
    required: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "GEMINI_API_KEY",
      "ANTHROPIC_API_KEY",
      "GROQ_API_KEY",
    ],
    optional: [
      "SUPABASE_SERVICE_ROLE_KEY",
      "ONLINECOMPILER_API_KEY",
      "ELEVENLABS_API_KEY",
      "ELEVENLABS_VOICE_ID",
    ],
  };
  const missing = (names: string[]) => names.filter((n) => !process.env[n]);
  const missingRequired = missing(need.required);
  return NextResponse.json(
    {
      ok: missingRequired.length === 0,
      missingRequired,
      missingOptional: missing(need.optional),
      node: process.version,
    },
    { status: missingRequired.length === 0 ? 200 : 503 },
  );
}
