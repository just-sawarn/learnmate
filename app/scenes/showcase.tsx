"use client";

import { useCallback, useMemo } from "react";
import { LessonStage } from "@/components/lesson/lesson-stage";
import { SourceProvider } from "@/components/source/source-context";
import type { LessonScript } from "@/lib/schemas/lesson";

export function ScenesShowcase({
  script,
  pages,
}: {
  script: LessonScript;
  pages: Record<number, string>;
}) {
  const noop = useCallback(() => {}, []);
  const noAudio = useMemo(() => ({}), []);
  return (
    <SourceProvider pages={pages}>
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 p-6">
        <h1 className="text-xl font-semibold">Scene library</h1>
        <p className="text-sm text-muted-foreground">
          A hand-written script played by the same React scene library that Gemini-authored lessons
          use. The variable boxes come from really running the Python code in your browser.
        </p>
        <LessonStage
          script={script}
          audioUrls={noAudio}
          lang="en"
          onCheckpoint={noop}
          onSceneChange={noop}
          courseHref="/dashboard"
        />
      </main>
    </SourceProvider>
  );
}
