import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCourseSnapshot } from "@/lib/course-data";
import type { MasteryLevel } from "@/lib/mastery";
import { parsePlanRow } from "@/lib/plan/build";
import type { Database } from "@/lib/supabase/types";
import {
  activityByDay,
  scoreSeries,
  streaks,
  weakestTopics,
  type DayCount,
  type ScorePoint,
} from "./analytics";

type Supabase = SupabaseClient<Database>;

export interface CourseSummary {
  id: string;
  title: string;
  subject: string;
  pageCount: number;
  createdAt: string;
  topicCount: number;
  /** Average mastery 0-100, or null before the first quiz. */
  mastery: number | null;
  levels: Record<MasteryLevel, number>;
  exercisesPassed: number;
  exerciseTotal: number;
  quizzes: number;
  planVersion: number | null;
  /** The plan's first topic: what to study next. */
  next: { topicId: string; topicName: string; level: MasteryLevel; nextStep: string } | null;
  /** The course's first topic, for a "start the first lesson" shortcut before any quiz. */
  firstTopic: { id: string; name: string } | null;
}

export interface Overview {
  courses: CourseSummary[];
  activity: DayCount[];
  streak: { current: number; longest: number };
  activeDays: number;
  scores: (ScorePoint & { course: string })[];
  masteryTrend: { label: string; at: string; [course: string]: number | string }[];
  masteryCourses: string[];
  weakTopics: {
    topicId: string;
    topic: string;
    course: string;
    courseId: string;
    pct: number;
    total: number;
  }[];
  totals: {
    quizzes: number;
    avgScore: number | null;
    exercisesPassed: number;
    tutorQuestions: number;
    studySteps: number;
    perfectQuiz: boolean;
    strongTopics: number;
  };
}

const DAYS = 30;

/** Everything the dashboard and analytics pages show, gathered through the signed-in user's RLS-bound client. */
export async function loadOverview(supabase: Supabase): Promise<Overview> {
  const { data: courseRows } = await supabase
    .from("courses")
    .select("id,title,subject,page_count,created_at")
    .order("created_at", { ascending: false });
  const rows = courseRows ?? [];

  const since = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const [snapshots, plansRes, runs, events, questions] = await Promise.all([
    Promise.all(rows.map((c) => loadCourseSnapshot(supabase, c.id))),
    supabase.from("plans").select("*").order("created_at"),
    supabase.from("exercise_runs").select("created_at,passed").gte("created_at", since),
    supabase.from("study_events").select("created_at").gte("created_at", since),
    supabase
      .from("tutor_messages")
      .select("created_at")
      .eq("role", "user")
      .gte("created_at", since),
  ]);

  const plans = (plansRes.data ?? []).flatMap((r) => {
    const p = parsePlanRow(r);
    return p ? [{ ...p, courseId: r.course_id }] : [];
  });

  const courses: CourseSummary[] = rows.map((c, i) => {
    const snap = snapshots[i];
    const latest = plans
      .filter((p) => p.courseId === c.id)
      .sort((a, b) => b.version - a.version)[0];
    const levels: Record<MasteryLevel, number> = { weak: 0, okay: 0, strong: 0 };
    snap.mastery.forEach((m) => levels[m.level]++);
    const answered = snap.attempts.length > 0;
    const first = latest?.items[0];
    return {
      id: c.id,
      title: c.title,
      subject: c.subject,
      pageCount: c.page_count,
      createdAt: c.created_at,
      topicCount: snap.topics.length,
      mastery:
        answered && snap.mastery.length
          ? Math.round((snap.mastery.reduce((n, m) => n + m.score, 0) / snap.mastery.length) * 100)
          : null,
      levels,
      exercisesPassed: snap.passedExerciseIds.size,
      exerciseTotal: snap.exercises.length,
      quizzes: snap.attempts.length,
      planVersion: latest?.version ?? null,
      firstTopic: snap.topics[0] ? { id: snap.topics[0].id, name: snap.topics[0].name } : null,
      next: first
        ? {
            topicId: first.topicId,
            topicName: first.topicName,
            level: first.level,
            nextStep: first.nextStep,
          }
        : null,
    };
  });

  const stamps = [
    ...snapshots.flatMap((s) => s.attempts.map((a) => a.createdAt)),
    ...(runs.data ?? []).map((r) => r.created_at),
    ...(events.data ?? []).map((r) => r.created_at),
    ...(questions.data ?? []).map((r) => r.created_at),
  ];

  const scores = rows
    .flatMap((c, i) => scoreSeries(snapshots[i].attempts).map((p) => ({ ...p, course: c.title })))
    .sort((a, b) => a.at.localeCompare(b.at));

  const trendCourses = rows.filter((c) => plans.some((p) => p.courseId === c.id));
  const masteryTrend = plans
    .map((p) => {
      const title = rows.find((c) => c.id === p.courseId)?.title;
      const values = Object.values(p.mastery);
      if (!title || values.length === 0) return null;
      return {
        label: new Date(p.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        at: p.createdAt,
        [title]: Math.round((values.reduce((n, m) => n + m.score, 0) / values.length) * 100),
      };
    })
    .flatMap((x) => (x ? [x] : []));

  const weakTopics = rows
    .flatMap((c, i) => {
      const names = new Map(snapshots[i].topics.map((t) => [t.id, t.name]));
      return weakestTopics(snapshots[i].attempts)
        .filter((t) => names.has(t.topicId))
        .map((t) => ({
          topicId: t.topicId,
          topic: names.get(t.topicId)!,
          course: c.title,
          courseId: c.id,
          pct: t.pct,
          total: t.total,
        }));
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 8);

  const quizCount = scores.length;
  const correct = scores.reduce((n, s) => n + s.correct, 0);
  const total = scores.reduce((n, s) => n + s.total, 0);
  return {
    courses,
    activity: activityByDay(stamps, DAYS),
    streak: streaks(stamps),
    activeDays: new Set(
      activityByDay(stamps, DAYS)
        .filter((d) => d.count > 0)
        .map((d) => d.date),
    ).size,
    scores,
    masteryTrend,
    masteryCourses: trendCourses.map((c) => c.title),
    weakTopics,
    totals: {
      quizzes: quizCount,
      avgScore: total ? Math.round((correct / total) * 100) : null,
      exercisesPassed: courses.reduce((n, c) => n + c.exercisesPassed, 0),
      tutorQuestions: (questions.data ?? []).length,
      studySteps: (events.data ?? []).length,
      perfectQuiz: scores.some((x) => x.total > 0 && x.correct === x.total),
      strongTopics: courses.reduce((n, c) => n + c.levels.strong, 0),
    },
  };
}
