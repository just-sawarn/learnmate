"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, PanelRightClose, PanelRightOpen, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IdePanel,
  type IdeExercise,
  type IdeHandle,
  type IdeSnapshot,
} from "@/components/ide/ide-panel";
import { PracticePanel, type PracticeQuestion } from "@/components/practice/practice-panel";
import { LessonStage } from "@/components/lesson/lesson-stage";
import { Celebrate } from "@/components/ui/celebrate";
import { SourceProvider } from "@/components/source/source-context";
import { GuruPanel } from "@/components/tutor/guru-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LangToggle } from "@/components/ui/lang-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LANGUAGE_LABELS } from "@/lib/ide-templates";
import type { Diagnostic } from "@/lib/schemas/diagnostic";
import type { Files, Language, TestResult } from "@/lib/schemas/exercise";
import { lessonScriptSchema, type LessonScript, type Scene } from "@/lib/schemas/lesson";
import type { TutorContext } from "@/lib/schemas/tutor";
import type { Json } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/browser";
import { preloadPython } from "@/lib/runners/python";

export interface LearnExercise extends IdeExercise {
  id: string;
  page: number;
}

interface Props {
  userId: string;
  course: { id: string; title: string };
  topic: { id: string; name: string; summary: string };
  pages: Record<number, string>;
  exercises: LearnExercise[];
  passedExerciseIds: string[];
  /** "concepts" courses have interactive practice questions instead of a code editor. */
  kind: "programming" | "concepts";
  practice: PracticeQuestion[];
  practiceDoneIds: string[];
  /** The next topic in the course, for the end-of-lesson "Next lesson" button. */
  nextTopic: { id: string; name: string } | null;
  uiLang: "en" | "hi";
}

type LessonState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "recording"; script: LessonScript }
  | { status: "ready"; script: LessonScript; audioUrls: Record<string, string> };

export function LearnWorkspace({
  userId,
  course,
  topic,
  pages,
  exercises,
  passedExerciseIds,
  kind,
  practice,
  practiceDoneIds,
  nextTopic,
  uiLang,
}: Props) {
  const concepts = kind === "concepts";
  const [practiceDone, setPracticeDone] = useState(() => new Set(practiceDoneIds));
  const [practiceStart, setPracticeStart] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [lesson, setLesson] = useState<LessonState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [ideOpen, setIdeOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(exercises[0]?.id ?? null);
  const [passed, setPassed] = useState(() => new Set(passedExerciseIds));
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [failedChecks, setFailedChecks] = useState(0);
  const [allPassed, setAllPassed] = useState(false);
  const [codeVersion, setCodeVersion] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [askRequest, setAskRequest] = useState(0);
  const ide = useRef<IdeHandle>(null);
  const [planUpdate, setPlanUpdate] = useState<{ version: number; summary: string | null } | null>(
    null,
  );
  const snapshot = useRef<IdeSnapshot | null>(null);
  const scene = useRef<{ index: number; scene: Scene } | null>(null);

  const exercise = exercises.find((e) => e.id === activeId) ?? null;

  // Start loading the Python engine now (in parallel with writing the lesson), so traced scenes don't wait for it later.
  useEffect(() => {
    if (kind === "programming") preloadPython();
  }, [kind]);

  useEffect(() => {
    const controller = new AbortController();
    const post = async (url: string, extra: Record<string, unknown> = {}) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, uiLang, ...extra }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        script?: unknown;
        error?: string;
        narrationVoice?: string;
      };
      return {
        ok: res.ok,
        script: lessonScriptSchema.safeParse(data.script),
        error: data.error,
        narrationVoice: data.narrationVoice,
      };
    };

    /** Signed URLs for every recorded scene; empty when nothing is recorded (the browser voice takes over). */
    const sign = async (script: LessonScript): Promise<Record<string, string>> => {
      const paths = script.scenes.flatMap((sc) => (sc.audio ? [sc.audio.path] : []));
      if (paths.length === 0) return {};
      const { data } = await createClient().storage.from("narration").createSignedUrls(paths, 3600);
      return Object.fromEntries(
        (data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl]] : [])),
      );
    };

    (async () => {
      const lessonRes = await post("/api/lesson");
      if (!lessonRes.ok || !lessonRes.script.success)
        throw new Error(lessonRes.error ?? "The lesson wasn't usable.");
      let script = lessonRes.script.data;

      // Narration is recorded in the background, the first two scenes first, so the lesson can start in a couple of
      // seconds instead of waiting for every scene. Scenes with no audio yet (or recorded in an older voice) are the
      // ones to record; the rest arrive while the lesson plays.
      const wanted = lessonRes.narrationVoice;
      const stale = (sc: LessonScript["scenes"][number]) =>
        !sc.audio || (wanted?.startsWith("elevenlabs") && sc.audio.voice !== wanted);
      const todo = script.scenes.flatMap((sc, i) => (stale(sc) ? [i] : []));
      if (todo.length > 0) {
        setLesson({ status: "recording", script });
        try {
          const first = await post("/api/narration", { scenes: todo.slice(0, 2) });
          if (first.ok && first.script.success) script = first.script.data;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") throw e;
          // No recording: the stage falls back to the browser's voice, so the lesson still plays.
        }
      }
      let audioUrls = await sign(script);
      setLesson({ status: "ready", script, audioUrls });

      // The remaining scenes, a few at a time and one request after another (each updates the saved lesson).
      // If the first scenes could not be recorded, stop: the voice provider is unavailable and retrying wastes time.
      const recordedFirst =
        todo.length === 0 || todo.slice(0, 2).some((i) => !!script.scenes[i]?.audio);
      if (recordedFirst) {
        const rest = todo.slice(2);
        for (let k = 0; k < rest.length; k += 4) {
          try {
            const more = await post("/api/narration", { scenes: rest.slice(k, k + 4) });
            if (!more.ok || !more.script.success) break;
            script = more.script.data;
            audioUrls = { ...audioUrls, ...(await sign(script)) };
            const next = { script, audioUrls };
            setLesson((prev) => (prev.status === "ready" ? { status: "ready", ...next } : prev));
          } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") return;
            break;
          }
        }
      }

      // Get the next lesson written in the background, so "Next lesson" opens straight away.
      if (nextTopic) {
        setTimeout(() => {
          if (controller.signal.aborted) return;
          fetch("/api/lesson", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ topicId: nextTopic.id, uiLang }),
          }).catch(() => undefined);
        }, 3000);
      }
    })().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setLesson({
        status: "error",
        message: e instanceof Error ? e.message : "Couldn't build this lesson.",
      });
    });
    return () => controller.abort();
  }, [topic.id, uiLang, attempt, nextTopic]);

  const onCheckpoint = useCallback((exerciseId: string) => {
    setActiveId(exerciseId);
    setPracticeStart(exerciseId);
    setIdeOpen(true);
  }, []);

  const lessonDone = useRef(false);
  const lastIndex = lesson.status === "ready" ? lesson.script.scenes.length - 1 : -1;
  const onSceneChange = useCallback(
    (index: number, s: Scene) => {
      scene.current = { index, scene: s };
      // The lesson counts as watched once the student reaches its checkpoint (or last scene): this ticks their checklist.
      if (!lessonDone.current && (s.type === "Checkpoint" || index === lastIndex)) {
        lessonDone.current = true;
        fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ courseId: course.id, topicId: topic.id, kind: "lesson" }),
        }).catch(() => undefined);
      }
    },
    [course.id, topic.id, lastIndex],
  );

  const onSnapshot = useCallback((s: IdeSnapshot) => {
    snapshot.current = s;
    setCodeVersion((v) => v + 1);
    setHasError(!!s.runError || (!!s.lastRun && s.lastRun.exitCode !== 0 && !!s.lastRun.stderr));
  }, []);

  const onCheck = useCallback(
    async (results: TestResult[], files: Files, language: Language) => {
      if (!activeId) return;
      const ok = results.length > 0 && results.every((r) => r.passed);
      setDiagnostics([]);
      setAllPassed(ok);
      setFailedChecks((n) => (ok ? 0 : n + 1));
      if (ok) {
        setPassed((prev) => new Set(prev).add(activeId));
        setBurst((b) => b + 1);
      }
      await createClient()
        .from("exercise_runs")
        .insert({
          user_id: userId,
          exercise_id: activeId,
          language,
          code: files as unknown as Json,
          passed: ok,
          results: results as unknown as Json,
        });
      if (!ok) return;
      // Passing changes mastery, so ask for a new plan version (the server only creates one if something moved).
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ courseId: course.id, basedOn: `exercise:${activeId}`, uiLang }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          created: boolean;
          plan: { version: number; changeSummary: string | null };
        };
        if (data.created)
          setPlanUpdate({ version: data.plan.version, summary: data.plan.changeSummary });
      } catch {
        // The pass is already saved; the plan will catch up on the next change.
      }
    },
    [activeId, userId, course.id, uiLang],
  );

  const getContext = useCallback((): TutorContext => {
    const snap = snapshot.current;
    const current = scene.current;
    return {
      topic: { id: topic.id, name: topic.name },
      scene: current
        ? { index: current.index, title: current.scene.type, page: current.scene.page }
        : null,
      exercise: exercise ? { id: exercise.id, prompt: exercise.prompt } : null,
      language: snap?.language ?? exercise?.language ?? null,
      files: snap?.files ?? null,
      stdout: snap?.lastRun?.stdout || null,
      stderr: snap?.runError ?? (snap?.lastRun?.stderr || null),
      testResults: snap?.testResults ?? null,
    };
  }, [topic, exercise]);

  return (
    <SourceProvider pages={pages}>
      <Celebrate burst={burst} />
      <div className="flex h-screen flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-2">
          <Link
            href={`/course/${course.id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {course.title}
          </Link>
          <h1 className="font-semibold">{topic.name}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIdeOpen((o) => !o)}
              aria-expanded={ideOpen}
            >
              {ideOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
              {concepts
                ? ideOpen
                  ? "Hide practice"
                  : "Open practice"
                : ideOpen
                  ? "Hide editor"
                  : "Open editor"}
            </Button>
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6" aria-label="Lesson">
            <div className="mx-auto w-full max-w-5xl space-y-5">
              {(lesson.status === "loading" || lesson.status === "recording") && (
                <div
                  className="mx-auto w-full space-y-3"
                  style={{ maxWidth: "min(100%, calc((100vh - 13.5rem) * 16 / 9))" }}
                  aria-busy="true"
                >
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <p className="text-center text-sm text-muted-foreground">
                    {lesson.status === "loading"
                      ? "Writing your lesson from your pages…"
                      : "Getting the narration ready…"}
                  </p>
                </div>
              )}
              {lesson.status === "error" && (
                <div
                  role="alert"
                  className="space-y-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm"
                >
                  <p>{lesson.message}</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setLesson({ status: "loading" });
                      setAttempt((a) => a + 1);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" /> Try again
                  </Button>
                </div>
              )}
              {lesson.status === "ready" && (
                <LessonStage
                  script={lesson.script}
                  audioUrls={lesson.audioUrls}
                  lang={uiLang}
                  onCheckpoint={onCheckpoint}
                  onSceneChange={onSceneChange}
                  nextTopic={nextTopic}
                  courseHref={`/course/${course.id}`}
                  afterHint={
                    concepts
                      ? "Now try the practice questions on the right."
                      : exercises.length > 0
                        ? "Now try the exercise in the editor on the right."
                        : "Nicely done."
                  }
                />
              )}
              {planUpdate && (
                <div
                  role="status"
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-3 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <p className="flex-1">
                    <span className="font-medium">Plan v{planUpdate.version} is ready. </span>
                    {planUpdate.summary}
                  </p>
                  <Link href={`/course/${course.id}`}>
                    <Button size="sm" variant="outline">
                      See the plan
                    </Button>
                  </Link>
                </div>
              )}
              {concepts && practice.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">Practice</h2>
                  <button
                    onClick={() => {
                      setPracticeStart(null);
                      setIdeOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    {practiceDone.size >= practice.length && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    Practice questions · {practice.filter((p) => practiceDone.has(p.id)).length}/
                    {practice.length} done
                  </button>
                </div>
              )}
              {!concepts && exercises.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">Practice</h2>
                  <div className="flex flex-wrap gap-2">
                    {exercises.map((e, i) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setActiveId(e.id);
                          setIdeOpen(true);
                        }}
                        aria-pressed={e.id === activeId}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${e.id === activeId ? "border-primary bg-accent" : "hover:bg-muted"}`}
                      >
                        {passed.has(e.id) && <CheckCircle2 className="h-4 w-4 text-success" />}
                        Exercise {i + 1} · {LANGUAGE_LABELS[e.language]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <motion.aside
            aria-label={concepts ? "Practice" : "Code editor"}
            initial={false}
            animate={{ width: ideOpen ? "52%" : 0, opacity: ideOpen ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            className="min-w-0 overflow-hidden border-l"
          >
            {/* pb-16 keeps the panel clear of the floating Ask Guru button */}
            <div className="h-full min-w-[420px] pb-16">
              {concepts ? (
                <PracticePanel
                  userId={userId}
                  questions={practice}
                  doneIds={[...practiceDone]}
                  startId={practiceStart}
                  onCorrect={(id) => {
                    setPracticeDone((prev) => new Set(prev).add(id));
                    setBurst((b) => b + 1);
                  }}
                  onAskGuru={() => setAskRequest((n) => n + 1)}
                />
              ) : (
                <IdePanel
                  key={exercise?.id ?? "scratch"}
                  exercise={exercise}
                  diagnostics={diagnostics}
                  onSnapshot={onSnapshot}
                  onCheck={onCheck}
                  onAskGuru={() => setAskRequest((n) => n + 1)}
                  ref={ide}
                />
              )}
            </div>
          </motion.aside>
        </div>

        <GuruPanel
          courseId={course.id}
          uiLang={uiLang}
          getContext={getContext}
          exercise={exercise ? { id: exercise.id, prompt: exercise.prompt } : null}
          signals={{ failedChecks, hasError, codeVersion, allPassed }}
          askRequest={askRequest}
          onDiagnostics={setDiagnostics}
          onEdits={(edits) => {
            setIdeOpen(true);
            ide.current?.applyEdits(edits);
          }}
        />
      </div>
    </SourceProvider>
  );
}
