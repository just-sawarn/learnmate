import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { AiOutputError } from "@/lib/ai/types";
import { wantedVoice } from "@/lib/lesson/narrate";
import { getOrCreateLesson, LessonNotFoundError } from "@/lib/lesson/generate";

export const maxDuration = 90;

const bodySchema = z.object({
  topicId: z.string().uuid(),
  uiLang: z.enum(["en", "hi"]).default("en"),
});

/** Gemini-authored lesson script for a topic: validated against the stored pages, then cached. */
export async function POST(request: Request) {
  const auth = await authorize(null);
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That lesson request wasn't valid.");

  try {
    const result = await getOrCreateLesson(auth.supabase, parsed.data.topicId, parsed.data.uiLang);
    // narrationVoice tells the player which voice recordings should be in, so older ones get upgraded.
    return NextResponse.json({ ...result, provider: "claude", narrationVoice: wantedVoice() });
  } catch (error) {
    if (error instanceof LessonNotFoundError) return jsonError(404, "Topic not found.");
    if (error instanceof AiOutputError)
      return jsonError(502, "The AI's lesson wasn't usable. Please try again.");
    return jsonError(502, "Couldn't build this lesson right now. Please try again.");
  }
}
