import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { LessonMissingError, recordNarration } from "@/lib/lesson/narrate";

export const maxDuration = 120;

const bodySchema = z.object({
  topicId: z.string().uuid(),
  uiLang: z.enum(["en", "hi"]).default("en"),
});

/** Records the lesson's narration (ElevenLabs when configured, else Gemini) so animation can follow the real voice. */
export async function POST(request: Request) {
  const auth = await authorize("narration");
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That narration request wasn't valid.");

  try {
    const result = await recordNarration(
      auth.supabase,
      auth.user.id,
      parsed.data.topicId,
      parsed.data.uiLang,
    );
    return NextResponse.json({
      ...result,
      provider: result.voice.startsWith("elevenlabs") ? "elevenlabs" : "gemini",
    });
  } catch (error) {
    if (error instanceof LessonMissingError) return jsonError(404, "Lesson not found.");
    return jsonError(
      502,
      "Couldn't record the narration right now. The lesson will use your browser's voice.",
    );
  }
}
