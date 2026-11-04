import { notFound } from "next/navigation";
import { filesSchema, languageSchema, testCaseSchema } from "@/lib/schemas/exercise";
import { practiceItemSchema } from "@/lib/schemas/practice";
import { toPageMap } from "@/lib/grounding";
import { createClient } from "@/lib/supabase/server";
import { LearnWorkspace, type LearnExercise } from "./workspace";

export default async function LearnPage({ params }: PageProps<"/learn/[topicId]">) {
  const { topicId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: topic } = await supabase
    .from("topics")
    .select("id,course_id,name,summary,pages,position")
    .eq("id", topicId)
    .maybeSingle();
  if (!topic) notFound();

  const [
    { data: course },
    { data: pages },
    { data: exerciseRows },
    { data: practiceRows },
    { data: profile },
  ] = await Promise.all([
    supabase.from("courses").select("id,title,kind,language").eq("id", topic.course_id).single(),
    supabase
      .from("course_pages")
      .select("page_no,text")
      .eq("course_id", topic.course_id)
      .order("page_no"),
    supabase.from("exercises").select("*").eq("topic_id", topicId).order("page"),
    supabase.from("practice_items").select("id,data,page").eq("topic_id", topicId).order("page"),
    supabase.from("profiles").select("ui_lang").eq("id", user.id).maybeSingle(),
  ]);
  if (!course) notFound();
  const { data: next } = await supabase
    .from("topics")
    .select("id,name")
    .eq("course_id", topic.course_id)
    .gt("position", topic.position)
    .order("position")
    .limit(1)
    .maybeSingle();

  const exerciseIds = (exerciseRows ?? []).map((e) => e.id);
  const { data: passedRuns } = exerciseIds.length
    ? await supabase
        .from("exercise_runs")
        .select("exercise_id")
        .in("exercise_id", exerciseIds)
        .eq("passed", true)
    : { data: [] };

  const practice = (practiceRows ?? []).flatMap((row) => {
    const item = practiceItemSchema.safeParse(row.data);
    return item.success ? [{ id: row.id, page: row.page, item: item.data }] : [];
  });
  const practiceIds = practice.map((p) => p.id);
  const { data: doneRows } = practiceIds.length
    ? await supabase
        .from("practice_answers")
        .select("item_id")
        .in("item_id", practiceIds)
        .eq("correct", true)
    : { data: [] };

  const exercises: LearnExercise[] = (exerciseRows ?? []).flatMap((row) => {
    const language = languageSchema.safeParse(row.language);
    const starterFiles = filesSchema.safeParse(row.starter_files);
    const tests = testCaseSchema.array().safeParse(row.tests);
    if (!language.success || !starterFiles.success || !tests.success) return [];
    return [
      {
        id: row.id,
        language: language.data,
        prompt: row.prompt,
        starterFiles: starterFiles.data,
        tests: tests.data,
        page: row.page,
      },
    ];
  });

  return (
    <LearnWorkspace
      userId={user.id}
      course={course}
      topic={{ id: topic.id, name: topic.name, summary: topic.summary }}
      pages={Object.fromEntries(toPageMap(pages ?? []))}
      exercises={exercises}
      passedExerciseIds={[...new Set((passedRuns ?? []).map((r) => r.exercise_id))]}
      kind={course.kind}
      practice={practice}
      nextTopic={next ?? null}
      practiceDoneIds={[...new Set((doneRows ?? []).map((r) => r.item_id))]}
      uiLang={profile?.ui_lang ?? "en"}
    />
  );
}
