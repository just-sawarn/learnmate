"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Circle,
  ListChecks,
  Network,
  NotebookPen,
} from "lucide-react";
import { MasteryRing } from "@/components/course/mastery-ring";
import { PlanView, LevelChip } from "@/components/plan/plan-view";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PageChip } from "@/components/source/source-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TopicMastery } from "@/lib/mastery";
import type { StoredPlan } from "@/lib/plan/build";
import { cn } from "@/lib/utils";

interface Props {
  course: { id: string; title: string; subject: string; page_count: number };
  topics: {
    id: string;
    name: string;
    summary: string;
    pages: number[];
    exercises: { id: string; prompt: string; page: number; passed: boolean }[];
    mastery: TopicMastery | null;
  }[];
  plan: StoredPlan | null;
  kind: "programming" | "concepts";
  hasDiagnostic: boolean;
  uiLang: "en" | "hi";
}

const TOOLS = [
  { slug: "notes", label: "Revision notes", hint: "Key points per topic", Icon: NotebookPen },
  { slug: "mindmap", label: "Mind map", hint: "See how it connects", Icon: Network },
  { slug: "checklist", label: "Checklist", hint: "Track every step", Icon: CheckSquare },
] as const;

export function CourseView({ course, topics, plan, kind, hasDiagnostic, uiLang }: Props) {
  const router = useRouter();
  const names = Object.fromEntries(topics.map((t) => [t.id, t.name]));

  const scored = topics.filter((t) => t.mastery);
  const mastery = scored.length
    ? Math.round((scored.reduce((n, t) => n + t.mastery!.score, 0) / scored.length) * 100)
    : null;
  const levels = { weak: 0, okay: 0, strong: 0 };
  scored.forEach((t) => levels[t.mastery!.level]++);
  const exTotal = topics.reduce((n, t) => n + t.exercises.length, 0);
  const exDone = topics.reduce((n, t) => n + t.exercises.filter((e) => e.passed).length, 0);
  const next = plan?.items[0]
    ? { id: plan.items[0].topicId, name: plan.items[0].topicName }
    : topics[0]
      ? { id: topics[0].id, name: topics[0].name }
      : null;

  const weakCount = levels.weak;
  const stat = (label: string, value: string) => (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold leading-tight">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-8">
      <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <MasteryRing value={mastery} />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">
              {hasDiagnostic ? "Where you stand" : "Ready when you are"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasDiagnostic
                ? weakCount > 0
                  ? `${weakCount} ${weakCount === 1 ? "topic needs" : "topics need"} more work. Your plan puts them first.`
                  : "Nothing is weak right now. Keep practising to stay sharp."
                : "Take the quick quiz below to see which topics to study first, or jump straight into lesson 1."}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4">
            {stat("Topics", String(topics.length))}
            {stat(
              kind === "concepts" ? "Practice done" : "Exercises passed",
              `${exDone}/${exTotal}`,
            )}
            {hasDiagnostic
              ? stat("Strong topics", `${levels.strong}/${topics.length}`)
              : stat("Quiz", "Not taken")}
          </dl>
        </div>
        {next && (
          <Link
            href={`/learn/${next.id}`}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {hasDiagnostic ? "Continue" : "Start lesson 1"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </Card>

      <Card id="quiz" className="space-y-4 p-5 sm:p-6" aria-label="Quiz">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-accent">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold">{hasDiagnostic ? "Practice quiz" : "Diagnostic quiz"}</h2>
            <p className="text-sm text-muted-foreground">
              {hasDiagnostic
                ? "New questions on your weakest topics. Each one quotes the page it comes from, and none repeat."
                : "About 3 minutes. Your answers decide what goes first in your revision plan."}
            </p>
          </div>
        </div>
        <QuizRunner
          courseId={course.id}
          kind={hasDiagnostic ? "practice" : "diagnostic"}
          uiLang={uiLang}
          topicNames={names}
          onFinished={() => router.refresh()}
        />
      </Card>

      {plan && (
        <PlanView plan={plan} uiLang={uiLang} limit={3} moreHref={`/course/${course.id}/plan`} />
      )}

      <section aria-label="Study tools" className="grid gap-3 sm:grid-cols-3">
        {TOOLS.map(({ slug, label, hint, Icon }) => (
          <Link key={slug} href={`/course/${course.id}/${slug}`} className="group rounded-xl">
            <Card interactive className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
              <ArrowRight
                className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Card>
          </Link>
        ))}
      </section>

      <section className="space-y-3" aria-label="Topic map">
        <h2 className="text-lg font-semibold">Topic map</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map((t, i) => {
            const done = t.exercises.filter((e) => e.passed).length;
            const complete = t.exercises.length > 0 && done === t.exercises.length;
            const isNext = next?.id === t.id;
            return (
              <Card
                key={t.id}
                className={cn(
                  "flex flex-col gap-3 p-4",
                  isNext && "border-primary/40 ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      complete ? "bg-success/15 text-success" : "bg-accent",
                    )}
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{t.name}</h3>
                      {isNext && hasDiagnostic && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                          Up next
                        </span>
                      )}
                      {t.mastery && <LevelChip level={t.mastery.level} score={t.mastery.score} />}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{t.summary}</p>
                    <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      Pages:{" "}
                      {t.pages.map((p) => (
                        <PageChip key={p} page={p} />
                      ))}
                    </p>
                  </div>
                </div>
                {t.exercises.length > 0 && (
                  <details className="group text-xs">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {done === t.exercises.length ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                        {done}/{t.exercises.length}{" "}
                        {kind === "concepts" ? "practice questions done" : "exercises passed"}
                      </span>
                      <span className="underline underline-offset-2 group-open:hidden">Show</span>
                      <span className="hidden underline underline-offset-2 group-open:inline">
                        Hide
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {t.exercises.map((e) => (
                        <li key={e.id} className="flex items-start gap-1.5">
                          {e.passed ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                          ) : (
                            <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span>
                            {e.prompt} <PageChip page={e.page} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <Link href={`/learn/${t.id}`} className="mt-auto">
                  <Button size="sm" variant={isNext ? "default" : "outline"}>
                    {isNext ? "Start lesson" : "Open lesson"}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
