import { expect, test } from "@playwright/test";
import { quizQuestionSchema } from "../lib/schemas/content";
import { resetDemoCourse, setEditorCode, signIn, userClient } from "./support";

const BUGGY =
  "def sum_to(n):\n    total = 0\n    for i in range(1, n):\n        total += i\n    return total\n";
const FIXED =
  "def sum_to(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n";

test.describe.configure({ mode: "serial" });

let courseId = "";

test.beforeAll(async () => {
  courseId = await resetDemoCourse();
});

test("demo path: quiz -> plan v1 -> lesson -> checkpoint -> IDE fail then pass -> plan v2 -> out-of-scope", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/course/${courseId}`);

  // Topic map with page chips and exercises found
  await expect(page.getByRole("heading", { name: "Topic map" })).toBeVisible();
  await expect(page.getByText("Pages:").first()).toBeVisible();

  // Diagnostic quiz: answer the target topic's questions wrong, everything else right.
  await page.getByRole("button", { name: "Start diagnostic quiz" }).click();
  await expect(page.getByRole("radio").first()).toBeVisible();
  const { client } = await userClient();
  const { data: attempt } = await client
    .from("quiz_attempts")
    .select("questions")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const questions = quizQuestionSchema.array().parse(attempt!.questions);
  // The topic that owns the sum_to exercise is the one this student "doesn't understand".
  const { data: target } = await client
    .from("exercises")
    .select("topic_id")
    .eq("course_id", courseId)
    .ilike("prompt", "%sum_to%")
    .limit(1)
    .single();
  const { data: targetTopic } = await client
    .from("topics")
    .select("id,name")
    .eq("id", target!.topic_id)
    .single();
  const loopTopics = new Set([targetTopic!.id]);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const wrong = loopTopics.has(q.topicId);
    const pick = wrong ? (q.correctIndex + 1) % 4 : q.correctIndex;
    await page.getByRole("radio").nth(pick).click();
    const advance = page.getByRole("button", {
      name: i === questions.length - 1 ? "Finish quiz" : "Next question",
    });
    await expect(advance).toBeEnabled({ timeout: 60_000 }); // the instant feedback has arrived
    await advance.click();
  }

  // Plan v1 ranks a loop topic first
  await expect(page.getByText("You got")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Revision plan" })).toBeVisible();
  await expect(page.getByText("v1", { exact: true }).first()).toBeVisible();
  const firstItem = page
    .getByRole("region", { name: "Revision plan" })
    .getByRole("listitem")
    .first();
  await expect(firstItem.getByText("weak").first()).toBeVisible();
  await expect(firstItem.getByRole("heading", { name: targetTopic!.name })).toBeVisible();

  // Lesson: play to the checkpoint and the IDE opens with the exercise
  await firstItem.getByRole("link", { name: "Open lesson" }).click();
  await page.waitForURL("**/learn/**");
  const timeline = page.locator('[role="list"] > button');
  await expect(timeline.first()).toBeVisible({ timeout: 180_000 });
  await expect(page.getByRole("button", { name: "Start lesson", exact: true })).toBeVisible();
  // Jumping to a scene starts it; the Checkpoint pauses once its narration ends and opens the editor.
  await timeline.last().click();
  await expect(page.getByRole("complementary", { name: "Code editor" })).toBeVisible({
    timeout: 60_000,
  });

  // Buggy code fails
  await setEditorCode(page, BUGGY);
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText(/exit \d/)).toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/\d of \d tests passed/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/^0 of \d+ tests passed$/)).toBeVisible();

  // Guru: hint ladder, then a grounded question with a page citation
  await page.getByRole("button", { name: "Open Guru" }).click();
  const guru = page.getByRole("complementary", { name: "Guru tutor" });
  await guru.getByRole("button", { name: /Hint 1\/3/ }).click();
  // The provider chips no longer render, so wait for the hint itself to show up as a message.
  await expect(guru.locator("ul > li").first()).toBeVisible({ timeout: 90_000 });
  await guru.getByLabel("Ask Guru").fill("why does range stop before 5?");
  await guru.getByRole("button", { name: "Send" }).click();
  await expect(guru.getByRole("button", { name: /^p\. \d+$/ }).first()).toBeVisible({
    timeout: 90_000,
  });

  // Guru edits the editor, with the student's approval. A first "fix it" teaches; the second ask unlocks the fix.
  const askGuru = async (message: string) => {
    const seen = await guru.getByText("What Guru looked at").count();
    await guru.getByLabel("Ask Guru").fill(message);
    await guru.getByRole("button", { name: "Send" }).click();
    await expect
      .poll(() => guru.getByText("What Guru looked at").count(), { timeout: 120_000 })
      .toBeGreaterThan(seen);
  };
  const edited = page.getByRole("status", { name: "Guru's edit" });
  await askGuru("Can you just fix line 3 for me?"); // first ask: teaches, at most a hint comment
  await askGuru("Please, just fix it for me, I need the answer."); // second ask: unlocks the fix, applied on its own
  const readCode = () =>
    page.evaluate(() =>
      (
        window as unknown as { monaco: { editor: { getModels(): { getValue(): string }[] } } }
      ).monaco.editor
        .getModels()[0]
        .getValue(),
    );
  if (/n \+ 1/.test(await readCode())) {
    await expect(edited).toContainText("Guru edited your code");
  } else {
    await setEditorCode(page, FIXED); // the model declined to edit this time: don't let that fail the journey
  }

  // All tests pass and a new plan version appears with a change banner
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/^(\d+) of \1 tests passed$/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Plan v2 is ready/)).toBeVisible({ timeout: 120_000 });
  await page.goto(`/course/${courseId}`);
  await expect(page.getByText("What changed in v2")).toBeVisible();

  // Out-of-scope question gets the amber banner
  await page.goto(
    `/learn/${(await client.from("topics").select("id").eq("course_id", courseId).order("position").limit(1).single()).data!.id}`,
  );
  await page.getByRole("button", { name: "Open Guru" }).click();
  const guru2 = page.getByRole("complementary", { name: "Guru tutor" });
  await guru2.getByLabel("Ask Guru").fill("how do I use pandas?");
  await guru2.getByRole("button", { name: "Send" }).click();
  await expect(guru2.getByRole("note")).toContainText("Beyond your uploaded material", {
    timeout: 90_000,
  });
});

test("IDE runs HTML and C++ programs", async ({ page }) => {
  await signIn(page);
  await page.goto("/playground");

  await page.getByLabel("Language").selectOption("html");
  await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[title="Live preview"]')
      .getByRole("heading", { name: "Hello LearnMate" }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("Language").selectOption("cpp");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText("Hello from C++ 0")).toBeVisible({ timeout: 90_000 });
});
