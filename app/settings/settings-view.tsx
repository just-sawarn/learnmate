"use client";

import { Download, Loader2, Moon, PlayCircle, Sun, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { inputClassName } from "@/components/design/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

function Section({
  title,
  hint,
  children,
  danger,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div>
        <h2 className={cn("text-lg font-semibold", danger && "text-danger")}>{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <Card className={cn("space-y-4 p-5", danger && "border-danger/40")}>{children}</Card>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: { id: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border bg-muted p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            value === o.id
              ? "bg-card font-medium shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const VOICE_KEY = "learnmate:voice";

export function SettingsView({
  userId,
  email,
  uiLang,
}: {
  userId: string;
  email: string;
  uiLang: "en" | "hi";
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState(uiLang);
  const [voice, setVoice] = useState<"on" | "off">("on");
  useEffect(() => {
    setMounted(true);
    try {
      setVoice(localStorage.getItem(VOICE_KEY) === "off" ? "off" : "on");
    } catch {
      // private mode: the default stays
    }
  }, []);

  async function changeLang(next: "en" | "hi") {
    setLang(next);
    await createClient().from("profiles").update({ ui_lang: next }).eq("id", userId);
    router.refresh();
  }

  // password
  const [pw, setPw] = useState({ next: "", again: "" });
  const [pwState, setPwState] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8) return setPwState({ ok: false, text: "Use at least 8 characters." });
    if (pw.next !== pw.again)
      return setPwState({ ok: false, text: "The two passwords don't match." });
    setPwBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw.next });
    setPwBusy(false);
    setPwState(
      error ? { ok: false, text: error.message } : { ok: true, text: "Password updated." },
    );
    if (!error) setPw({ next: "", again: "" });
  }

  // delete
  const [del, setDel] = useState({ open: false, password: "", confirm: "" });
  const [delState, setDelState] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });
  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    setDelState({ busy: true, error: null });
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: del.password, confirm: del.confirm }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok)
      return setDelState({ busy: false, error: data.error ?? "Couldn't delete the account." });
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Section title="Appearance">
        <Segmented
          label="Theme"
          value={mounted ? ((theme as "light" | "dark" | undefined) ?? "light") : null}
          onChange={setTheme}
          options={[
            { id: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
            { id: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
          ]}
        />
      </Section>

      <Section
        title="Language"
        hint="Lessons, quizzes, notes and Guru's replies are written in this language."
      >
        <Segmented
          label="Language"
          value={lang}
          onChange={changeLang}
          options={[
            { id: "en", label: "English" },
            { id: "hi", label: "हिन्दी" },
          ]}
        />
      </Section>

      <Section
        title="Lessons"
        hint="Lessons are narrated. You can still read the captions with the voice off."
      >
        <Segmented
          label="Lesson voice"
          value={voice}
          onChange={(v) => {
            setVoice(v);
            try {
              localStorage.setItem(VOICE_KEY, v);
            } catch {
              // ignore
            }
          }}
          options={[
            { id: "on", label: "Voice on" },
            { id: "off", label: "Voice off" },
          ]}
        />
        <Link
          href="/welcome?replay=1"
          className="flex items-center gap-2 text-sm font-medium underline underline-offset-2"
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" /> Replay the welcome tour
        </Link>
      </Section>

      <Section title="Account" hint={`Signed in as ${email}`}>
        <form onSubmit={changePassword} className="space-y-3">
          <h3 className="text-sm font-medium">Change password</h3>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (8+ characters)"
            aria-label="New password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            className={inputClassName}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Repeat the new password"
            aria-label="Repeat new password"
            value={pw.again}
            onChange={(e) => setPw({ ...pw, again: e.target.value })}
            className={inputClassName}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="outline" disabled={pwBusy || !pw.next}>
              {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
            </Button>
            {pwState && (
              <span
                role="status"
                className={cn("text-sm", pwState.ok ? "text-success" : "text-danger")}
              >
                {pwState.text}
              </span>
            )}
          </div>
        </form>
      </Section>

      <Section
        title="Your data"
        hint="Everything you've uploaded and created, as one file you own."
      >
        <a href="/api/account/export" download>
          <Button variant="outline">
            <Download className="h-4 w-4" /> Download my data (JSON)
          </Button>
        </a>
      </Section>

      <Section
        title="Delete account"
        danger
        hint="Permanently removes your account, courses, files, quizzes, notes and chats. This can't be undone."
      >
        {!del.open ? (
          <Button variant="danger" onClick={() => setDel({ ...del, open: true })}>
            <Trash2 className="h-4 w-4" /> Delete my account
          </Button>
        ) : (
          <form onSubmit={deleteAccount} className="space-y-3">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              aria-label="Your password"
              value={del.password}
              onChange={(e) => setDel({ ...del, password: e.target.value })}
              className={inputClassName}
            />
            <input
              placeholder="Type DELETE to confirm"
              aria-label="Type DELETE to confirm"
              value={del.confirm}
              onChange={(e) => setDel({ ...del, confirm: e.target.value })}
              className={inputClassName}
            />
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="danger"
                disabled={delState.busy || del.confirm !== "DELETE" || !del.password}
              >
                {delState.busy && <Loader2 className="h-4 w-4 animate-spin" />} Permanently delete
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDel({ open: false, password: "", confirm: "" })}
              >
                Cancel
              </Button>
            </div>
            {delState.error && (
              <p role="alert" className="text-sm text-danger">
                {delState.error}
              </p>
            )}
          </form>
        )}
      </Section>
    </div>
  );
}
