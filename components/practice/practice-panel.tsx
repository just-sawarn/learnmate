"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, PartyPopper, RotateCcw, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProviderBadge } from "@/components/ui/provider-badge";
import { checkCloze } from "@/lib/practice/grade";
import type { PracticeItem } from "@/lib/schemas/practice";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export interface PracticeQuestion {
  id: string;
  page: number;
  item: PracticeItem;
}

interface Props {
  userId: string;
  questions: PracticeQuestion[];
  /** Questions already answered correctly, so progress carries across visits. */
  doneIds: string[];
  /** Start on this question (from a lesson checkpoint). */
  startId?: string | null;
  onCorrect: (id: string) => void;
  onAskGuru: () => void;
}

type Result = { correct: boolean; feedback?: string; provider?: "groq" | "claude" };

/**
 * Interactive practice for material that isn't about programming. One question at a time with instant feedback:
 * multiple choice and fill-in-the-blank are checked on the spot, short answers are graded by AI in about a second.
 */
export function PracticePanel({
  userId,
  questions,
  doneIds,
  startId,
  onCorrect,
  onAskGuru,
}: Props) {
  const firstOpen = useMemo(() => {
    const byStart = startId ? questions.findIndex((q) => q.id === startId) : -1;
    if (byStart >= 0) return byStart;
    const open = questions.findIndex((q) => !doneIds.includes(q.id));
    return open >= 0 ? open : 0;
  }, [questions, doneIds, startId]);
  const [index, setIndex] = useState(firstOpen);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [finished, setFinished] = useState(false);
  const q = questions[index];

  const record = (id: string, answer: string, result: Result) => {
    setResults((r) => ({ ...r, [id]: result }));
    if (result.correct) onCorrect(id);
    // Short answers are recorded by the grading route; the instant kinds are recorded here.
    if (q.item.kind !== "short")
      void createClient()
        .from("practice_answers")
        .insert({ user_id: userId, item_id: id, answer, correct: result.correct });
  };

  if (!q)
    return (
      <p className="p-6 text-sm text-muted-foreground">No practice questions for this topic yet.</p>
    );

  const correctCount = questions.filter(
    (x) => results[x.id]?.correct || doneIds.includes(x.id),
  ).length;
  const next = () => (index + 1 < questions.length ? setIndex(index + 1) : setFinished(true));

  if (finished)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 12 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <PartyPopper className="h-8 w-8" />
        </motion.span>
        <h2 className="text-xl font-semibold">
          {correctCount} of {questions.length} correct
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          {correctCount === questions.length
            ? "Perfect. This topic is yours."
            : "Good work. Retry the ones you missed, or ask Guru to explain them."}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setFinished(false);
              setResults({});
              setIndex(0);
            }}
          >
            <RotateCcw className="h-4 w-4" /> Go again
          </Button>
          <Button onClick={onAskGuru}>Ask Guru</Button>
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Practice</h2>
        <div
          className="flex flex-1 items-center gap-1.5"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-label="Question progress"
        >
          {questions.map((x, i) => {
            const r = results[x.id];
            return (
              <span
                key={x.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i === index
                    ? "bg-foreground"
                    : r?.correct || doneIds.includes(x.id)
                      ? "bg-success"
                      : r
                        ? "bg-danger"
                        : "bg-muted",
                )}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          {index + 1}/{questions.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            <Question
              key={q.id}
              q={q}
              result={results[q.id]}
              onResult={(a, r) => record(q.id, a, r)}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onAskGuru}>
          Not sure? Ask Guru
        </Button>
        <Button size="sm" onClick={next} disabled={!results[q.id]}>
          {index + 1 < questions.length ? "Next" : "Finish"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Verdict({ result }: { result: Result }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className={cn(
        "mt-4 flex gap-2 rounded-xl border p-3 text-sm",
        result.correct ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10",
      )}
    >
      {result.correct ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      )}
      <div className="space-y-1">
        <p className="font-medium">{result.correct ? "Correct" : "Not quite"}</p>
        {result.feedback && <p>{result.feedback}</p>}
        {result.provider && <ProviderBadge provider={result.provider} note="graded" />}
      </div>
    </motion.div>
  );
}

function Question({
  q,
  result,
  onResult,
}: {
  q: PracticeQuestion;
  result?: Result;
  onResult: (answer: string, r: Result) => void;
}) {
  const item = q.item;
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  if (item.kind === "mcq")
    return (
      <div className="space-y-4">
        <p className="text-base font-medium">{item.question}</p>
        <ul className="space-y-2" role="radiogroup" aria-label="Answers">
          {item.options.map((opt, i) => {
            const chosen = picked === i;
            const right = result && i === item.correctIndex;
            const wrong = result && chosen && i !== item.correctIndex;
            return (
              <li key={i}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  disabled={!!result}
                  onClick={() => {
                    setPicked(i);
                    onResult(opt, {
                      correct: i === item.correctIndex,
                      feedback: item.explanation,
                    });
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    !result && "hover:bg-accent",
                    right && "border-success bg-success/10",
                    wrong && "border-danger bg-danger/10",
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                    {"ABCD"[i]}
                  </span>
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
        {result && (
          <>
            <Verdict result={result} />
          </>
        )}
      </div>
    );

  if (item.kind === "cloze") {
    const [before, after] = item.text.split("____");
    const submit = () => {
      const correct = checkCloze(text, item.answer);
      onResult(text, {
        correct,
        feedback: correct
          ? item.explanation
          : `The answer is "${item.answer}". ${item.explanation}`,
      });
    };
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Fill in the blank</p>
        <p className="text-base leading-relaxed">
          {before}
          <input
            ref={input}
            value={text}
            disabled={!!result}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text.trim() && !result && submit()}
            aria-label="Your answer"
            autoFocus
            className="mx-1 w-40 rounded-md border-b-2 border-foreground bg-muted px-2 py-0.5 text-center font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {after}
        </p>
        {!result && (
          <Button size="sm" onClick={submit} disabled={!text.trim()}>
            Check
          </Button>
        )}
        {result && (
          <>
            <Verdict result={result} />
          </>
        )}
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: q.id, answer: text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        correct?: boolean;
        feedback?: string;
        provider?: "groq" | "claude";
        error?: string;
      };
      if (!res.ok || data.correct === undefined)
        throw new Error(data.error ?? "Couldn't check that answer.");
      onResult(text, { correct: data.correct, feedback: data.feedback, provider: data.provider });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check that answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-medium">{item.question}</p>
      <textarea
        value={text}
        disabled={!!result || busy}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={1200}
        placeholder="Answer in your own words…"
        aria-label="Your answer"
        className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!result && (
        <Button size="sm" onClick={submit} disabled={!text.trim() || busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Checking…" : "Check my answer"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {result && (
        <>
          <Verdict result={result} />
          <div className="rounded-xl bg-muted p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              A strong answer
            </p>
            {item.modelAnswer}
          </div>
        </>
      )}
    </div>
  );
}
