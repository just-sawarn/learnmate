import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckSquare,
  FileText,
  Flame,
  Network,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { LevelChip } from "@/components/plan/plan-view";
import { Reveal, Stagger, StaggerItem } from "@/components/design/motion-primitives";
import { UploadCard } from "@/components/upload/upload-card";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import { createClient } from "@/lib/supabase/server";
import { loadOverview, type CourseSummary } from "@/lib/study/overview";

/** One number in the header strip: a label, the value, and an optional small hint or visual. */
function Stat({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      {children ?? (hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>)}
    </div>
  );
}

/** The last seven days as tiny bars, so a streak is something you can see. */
function WeekBars({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div
      className="flex h-4 items-end gap-0.5"
      role="img"
      aria-label="Activity over the last 7 days"
    >
      {days.map((d) => (
        <span
          key={d.date}
          title={`${d.date}: ${d.count}`}
          className={d.count ? "flex-1 rounded-sm bg-foreground/70" : "flex-1 rounded-sm bg-muted"}
          style={{ height: `${d.count ? 30 + (d.count / max) * 70 : 18}%` }}
        />
      ))}
    </div>
  );
}

function greeting(name: string | null | undefined): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

const MASTERY_DOT = { weak: "bg-danger", okay: "bg-warning", strong: "bg-success" } as const;

function CourseCard({ c }: { c: CourseSummary }) {
  const tools = [
    { href: "quizzes", label: "Quizzes", Icon: BarChart3 },
    { href: "notes", label: "Notes", Icon: NotebookPen },
    { href: "mindmap", label: "Mind map", Icon: Network },
    { href: "checklist", label: "Checklist", Icon: CheckSquare },
  ];
  const started = c.mastery !== null;
  return (
    <Card className="course-card flex h-full flex-col gap-4 p-5">
      <Link href={`/course/${c.id}`} className="group flex items-start gap-3 rounded-lg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-accent">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-semibold leading-snug text-balance group-hover:underline">
            {c.title}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {c.subject} · {c.pageCount} pages · {c.topicCount} topics
          </p>
        </div>
      </Link>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{started ? `${c.mastery}% mastery` : "Not started"}</span>
          <span className="text-xs text-muted-foreground">
            {c.exercisesPassed}/{c.exerciseTotal} {c.exerciseTotal === 1 ? "exercise" : "exercises"}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${c.title} mastery`}
          aria-valuenow={c.mastery ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-foreground/75 transition-[width] duration-700"
            style={{ width: `${c.mastery ?? 0}%` }}
          />
        </div>
        {started && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(["weak", "okay", "strong"] as const).map((level) => (
              <span key={level} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${MASTERY_DOT[level]}`} aria-hidden="true" />
                {c.levels[level]} {level}
              </span>
            ))}
          </p>
        )}
      </div>

      <Link
        href={c.next ? `/learn/${c.next.topicId}` : `/course/${c.id}/quizzes`}
        className="mt-auto flex items-center justify-between gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <span className="min-w-0 truncate">
          {c.next ? `Continue: ${c.next.topicName}` : "Take the diagnostic quiz"}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </Link>

      <ul className="grid grid-cols-4 gap-1.5" aria-label="Study tools">
        {tools.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={`/course/${c.id}/${href}`}
              className="flex flex-col items-center gap-1 rounded-lg border py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [o, { data: profile }] = await Promise.all([
    loadOverview(supabase),
    user
      ? supabase
          .from("profiles")
          .select("display_name,onboarded_at")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  // First visit after sign-up: the animated welcome comes first.
  if (user && profile && !profile.onboarded_at) redirect("/welcome");
  const next = o.courses.find((c) => c.next);
  // With no plan yet, the best next step is the quiz (or a first lesson) for the newest course that hasn't had one.
  const unquizzed = o.courses.find((c) => c.mastery === null);
  const first = profile?.display_name?.split(/\s+/)[0];

  return (
    <div className="dashboard-canvas min-h-screen">
      <SiteHeader />
      <main className="relative mx-auto grid w-full max-w-5xl flex-1 items-start gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-6">
          <Reveal className="dashboard-heading relative overflow-hidden rounded-3xl border bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="dashboard-heading__glow" aria-hidden="true" />
            <div className="relative space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {greeting(first)}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {o.courses.length === 0
                      ? "Let's build your first course."
                      : "Pick up where you left off, or start something new."}
                  </p>
                </div>
                {o.courses.length > 0 && o.streak.current > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium">
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    {o.streak.current} day streak
                  </span>
                )}
              </div>
              {o.courses.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-4">
                  <Stat label="Courses" value={String(o.courses.length)} />
                  <Stat
                    label="Last 7 days"
                    value={
                      String(o.activity.slice(-7).filter((d) => d.count > 0).length) + " active"
                    }
                  >
                    <WeekBars days={o.activity.slice(-7)} />
                  </Stat>
                  <Stat
                    label="Avg quiz score"
                    value={o.totals.avgScore === null ? "No quiz yet" : `${o.totals.avgScore}%`}
                    hint={
                      o.totals.avgScore === null
                        ? "Take one to see it"
                        : `${o.totals.quizzes} taken`
                    }
                  />
                  <Stat label="Exercises passed" value={String(o.totals.exercisesPassed)} />
                </dl>
              )}
            </div>
          </Reveal>

          {next?.next ? (
            <Card className="flex flex-col gap-4 border-primary/25 bg-accent/70 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Up next · {next.title}
                </p>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {next.next.topicName} <LevelChip level={next.next.level} />
                </p>
                <p className="text-sm text-muted-foreground">{next.next.nextStep}</p>
              </div>
              <Link
                href={`/learn/${next.next.topicId}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          ) : (
            unquizzed && (
              <Card className="flex flex-col gap-4 border-primary/25 bg-accent/70 sm:flex-row sm:items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Start here · {unquizzed.title}
                  </p>
                  <p className="font-semibold">Find out what to study first</p>
                  <p className="text-sm text-muted-foreground">
                    A short quiz (about 3 minutes) shows your weak topics and builds your revision
                    plan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/course/${unquizzed.id}/quizzes`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Take the quiz <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  {unquizzed.firstTopic && (
                    <Link
                      href={`/learn/${unquizzed.firstTopic.id}`}
                      className="inline-flex items-center justify-center rounded-xl border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Start lesson 1
                    </Link>
                  )}
                </div>
              </Card>
            )
          )}

          {o.courses.length === 0 ? (
            <Card className="empty-course-state surface-sheen space-y-5 border-dashed px-6 py-10 shadow-none">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-medium">No courses yet</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Add a chapter and rohmbic will build your first course.
                </p>
              </div>
              <ol className="mx-auto grid max-w-md gap-2 text-sm">
                {[
                  "Upload a PDF or paste your notes",
                  "Take a short quiz to find your weak spots",
                  "Learn from animated lessons and practise in the editor",
                ].map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <div className="space-y-3">
              <h2 className="flex items-baseline gap-2 text-lg font-semibold">
                Your courses
                <span className="text-sm font-normal text-muted-foreground">
                  {o.courses.length}
                </span>
              </h2>
              <Stagger className="grid gap-4 sm:grid-cols-2" role="list">
                {o.courses.map((c) => (
                  <StaggerItem key={c.id} role="listitem">
                    <CourseCard c={c} />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          )}
        </section>
        <Reveal
          delay={0.1}
          className="dashboard-upload-shell relative h-fit self-start lg:sticky lg:top-20"
        >
          <div className="dashboard-upload-shell__glow" aria-hidden="true" />
          <div className="relative">
            <UploadCard />
          </div>
        </Reveal>
      </main>
    </div>
  );
}
