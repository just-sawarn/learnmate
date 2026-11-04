import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { AiOutputError } from "@/lib/ai/types";
import { IngestError } from "@/lib/ingest/limits";
import { ingestMaterial, type IngestSource, type IngestStage } from "@/lib/ingest/pipeline";

export const maxDuration = 120;

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pdf"), storagePath: z.string().min(3).max(300) }),
  z.object({
    kind: z.literal("text"),
    text: z.string().min(1).max(200_000),
    title: z.string().max(100).optional(),
  }),
]);

export type IngestFrame =
  | { t: "progress"; stage: IngestStage; message: string }
  | { t: "done"; courseId: string; topicCount: number; exerciseCount: number; warnings: string[] }
  | { t: "error"; message: string };

/** Ingests a PDF (already uploaded to Storage by the browser) or pasted text, streaming progress as NDJSON. */
export async function POST(request: Request) {
  const auth = await authorize("ingest");
  if (isResponse(auth)) return auth;
  const { supabase, user } = auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That upload wasn't valid.");
  const body = parsed.data;

  if (body.kind === "pdf" && !body.storagePath.startsWith(`${user.id}/`)) {
    return jsonError(403, "That file doesn't belong to you.");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (frame: IngestFrame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
      try {
        let source: IngestSource;
        if (body.kind === "pdf") {
          const { data: blob, error } = await supabase.storage
            .from("materials")
            .download(body.storagePath);
          if (error || !blob)
            throw new IngestError("bad_pdf", "We couldn't find that upload. Please try again.");
          source = {
            kind: "pdf",
            data: new Uint8Array(await blob.arrayBuffer()),
            storagePath: body.storagePath,
            fileName: body.storagePath.split("/").pop() ?? "Uploaded PDF",
          };
        } else {
          source = { kind: "text", text: body.text, title: body.title };
        }
        const result = await ingestMaterial({
          supabase,
          userId: user.id,
          source,
          onProgress: (stage, message) => send({ t: "progress", stage, message }),
        });
        // Reference solutions stay on the server: only counts and warnings go to the browser.
        send({
          t: "done",
          courseId: result.courseId,
          topicCount: result.topicCount,
          exerciseCount: result.exerciseCount,
          warnings: result.warnings,
        });
      } catch (error) {
        if (!(error instanceof IngestError)) console.error("[ingest] failed:", error);
        if (body.kind === "pdf" && error instanceof IngestError) {
          await supabase.storage.from("materials").remove([body.storagePath]);
        }
        const missingConfig =
          error instanceof Error && error.message.startsWith("Invalid environment:")
            ? error.message.replace(/^Invalid environment: ([^.]*)\..*$/, "$1")
            : null;
        const message =
          error instanceof IngestError
            ? error.message
            : missingConfig
              ? `This server is missing settings it needs (${missingConfig}). Add them in the host's environment variables and redeploy. Open /api/health to see what is missing.`
              : error instanceof AiOutputError
                ? "The AI returned something we couldn't use. Please try again."
                : "Something went wrong while reading your material. Please try again.";
        send({ t: "error", message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
