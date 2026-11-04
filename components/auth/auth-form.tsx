"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Suspense, useState, type FormEvent } from "react";
import { BookOpen, Code2, Loader2, MessageCircle } from "lucide-react";
import { AnimatedAuroraBackground } from "@/components/design/animated-aurora-background";
import { inputClassName } from "@/components/design/input";
import { Logo } from "@/components/design/logo";
import { Reveal } from "@/components/design/motion-primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DAILY_MINUTES,
  GOALS,
  INTEREST_SUGGESTIONS,
  LEVELS,
  type SignupPreferences,
} from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const COPY: Record<
  Mode,
  { title: string; subtitle: string; cta: string; alt: string; altHref: string; altCta: string }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to pick up where you left off.",
    cta: "Sign in",
    alt: "New to rohmbic?",
    altHref: "/signup",
    altCta: "Create an account",
  },
  signup: {
    title: "Create your account",
    subtitle: "Turn your first chapter into a lesson in minutes.",
    cta: "Create account",
    alt: "Already have an account?",
    altHref: "/signin",
    altCta: "Sign in",
  },
};

const inputClass = inputClassName;

const BENEFITS = [
  { icon: BookOpen, text: "Turn your own material into a focused lesson" },
  { icon: Code2, text: "Practise beside the explanation while it is fresh" },
  { icon: MessageCircle, text: "Ask Guru for a hint when you get stuck" },
] as const;

function Form({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const copy = COPY[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    params.get("error") ? "Sign-in failed. Please try again." : null,
  );
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [prefs, setPrefs] = useState<SignupPreferences>({
    goal: null,
    level: null,
    interests: "",
    dailyMinutes: null,
    uiLang: "en",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signup" && step === 1) {
      if (!name.trim()) return setMessage("What should we call you?");
      setMessage(null);
      setStep(2);
      return;
    }
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else router.replace("/dashboard");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim() || undefined,
            goal: prefs.goal ?? undefined,
            level: prefs.level ?? undefined,
            interests: prefs.interests.trim() || undefined,
            daily_minutes: prefs.dailyMinutes ?? undefined,
            ui_lang: prefs.uiLang,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setMessage(error.message);
      else if (data.session) router.replace("/welcome");
      else setMessage("Almost there. Check your inbox to confirm your email, then sign in.");
    }
    setBusy(false);
  }

  const signupStep2 = mode === "signup" && step === 2;
  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm transition-colors",
      active ? "border-foreground bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
    );

  return (
    <Card
      className={cn(
        "auth-panel-enter surface-sheen w-full max-w-md space-y-5 rounded-3xl p-6 shadow-[0_28px_80px_-40px_rgb(var(--shadow-color)/0.38)] sm:p-8",
      )}
    >
      {mode === "signup" && (
        <div
          className="flex items-center gap-2"
          aria-label={`Step ${step} of 2`}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={2}
        >
          {[1, 2].map((n) => (
            <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.span
                className="block h-full rounded-full bg-foreground"
                initial={false}
                animate={{ width: step >= n ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </span>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {signupStep2 ? `Nice to meet you, ${name.trim().split(/\s+/)[0]}` : copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {signupStep2
            ? "A few quick questions so rohmbic can teach the way you like. All optional."
            : copy.subtitle}
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <AnimatePresence mode="wait" initial={false}>
          {!signupStep2 ? (
            <motion.div
              key="account"
              className="space-y-3"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {mode === "signup" && (
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  aria-label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              )}
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="Password (8+ characters)"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </motion.div>
          ) : (
            <motion.div
              key="about"
              className="space-y-5"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
            >
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">What brings you here?</legend>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={prefs.goal === g.id}
                      onClick={() =>
                        setPrefs({ ...prefs, goal: prefs.goal === g.id ? null : g.id })
                      }
                      className={chip(prefs.goal === g.id)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Where are you starting from?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      aria-pressed={prefs.level === l.id}
                      onClick={() =>
                        setPrefs({ ...prefs, level: prefs.level === l.id ? null : l.id })
                      }
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-center transition-colors",
                        prefs.level === l.id
                          ? "border-foreground bg-primary text-primary-foreground"
                          : "bg-card hover:bg-muted",
                      )}
                    >
                      <span className="block text-sm font-medium">{l.label}</span>
                      <span
                        className={cn(
                          "block text-[11px]",
                          prefs.level === l.id ? "opacity-80" : "text-muted-foreground",
                        )}
                      >
                        {l.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">What will you study?</legend>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="e.g. JavaScript, organic chemistry, Indian history"
                  aria-label="What you want to study"
                  value={prefs.interests}
                  onChange={(e) => setPrefs({ ...prefs, interests: e.target.value })}
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_SUGGESTIONS.map((t) => {
                    const on = prefs.interests.toLowerCase().includes(t.toLowerCase());
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setPrefs({
                            ...prefs,
                            interests: on
                              ? prefs.interests
                                  .replace(new RegExp(`,?\\s*${t}`, "i"), "")
                                  .replace(/^,\s*/, "")
                              : [prefs.interests.trim(), t].filter(Boolean).join(", "),
                          })
                        }
                        className={cn(chip(on), "px-2.5 py-1 text-xs")}
                      >
                        {on && <Check className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Minutes a day</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {DAILY_MINUTES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={prefs.dailyMinutes === m}
                        onClick={() =>
                          setPrefs({ ...prefs, dailyMinutes: prefs.dailyMinutes === m ? null : m })
                        }
                        className={chip(prefs.dailyMinutes === m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Language</legend>
                  <div className="flex gap-1.5">
                    {(
                      [
                        ["en", "English"],
                        ["hi", "हिन्दी"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={prefs.uiLang === id}
                        onClick={() => setPrefs({ ...prefs, uiLang: id })}
                        className={chip(prefs.uiLang === id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-2">
          {signupStep2 && (
            <Button type="button" variant="outline" onClick={() => setStep(1)} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? "One moment…" : mode === "signup" && step === 1 ? "Continue" : copy.cta}
          </Button>
        </div>
      </form>
      {message && (
        <p role="status" className="rounded-lg border bg-muted px-3 py-2 text-sm">
          {message}
        </p>
      )}
      {!signupStep2 && (
        <p className="text-center text-sm text-muted-foreground">
          {copy.alt}{" "}
          <Link
            href={copy.altHref}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {copy.altCta}
          </Link>
        </p>
      )}
    </Card>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  return (
    <main className="auth-stage relative isolate flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-10">
      <AnimatedAuroraBackground />
      <div className="bg-dots pointer-events-none absolute inset-0 -z-[1] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_74%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border bg-background/55 shadow-[0_32px_100px_-48px_rgb(var(--shadow-color)/0.45)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-story-enter relative hidden min-h-[36rem] flex-col justify-between overflow-hidden border-r p-10 lg:flex">
          <div className="auth-story-glow" aria-hidden="true" />
          <Link
            href="/"
            aria-label="rohmbic home"
            className="relative w-fit rounded-md transition-transform duration-200 hover:scale-[1.02]"
          >
            <Logo />
          </Link>
          <div className="relative max-w-md">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Learn with momentum
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your notes become somewhere to think, try and improve.
            </h2>
            <ul className="mt-8 space-y-4">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-card/70 text-foreground shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-muted-foreground">
            A calmer path from reading to understanding.
          </p>
        </section>
        <Reveal className="flex min-h-[36rem] flex-col items-center justify-center gap-6 p-5 sm:p-10">
          <Link
            href="/"
            aria-label="rohmbic home"
            className="rounded-md transition-transform duration-200 hover:scale-[1.02] lg:hidden"
          >
            <Logo />
          </Link>
          <Suspense>
            <Form mode={mode} />
          </Suspense>
        </Reveal>
      </div>
    </main>
  );
}
