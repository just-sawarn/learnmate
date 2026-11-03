"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { createClient } from "@/lib/supabase/browser";

/** Switches the student's language (English / हिन्दी). Every generated lesson, quiz and tutor reply reads it from the profile. */
export function LangToggle() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi" | null>(null);

  useEffect(() => {
    createClient()
      .from("profiles")
      .select("ui_lang")
      .maybeSingle()
      .then(({ data }) => setLang(data?.ui_lang ?? "en"));
  }, []);

  if (!lang) return null;
  const next = lang === "en" ? "hi" : "en";
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Switch language to ${next === "hi" ? "Hindi" : "English"}`}
      onClick={async () => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("profiles").upsert({ id: user.id, ui_lang: next });
        setLang(next);
        router.refresh();
      }}
    >
      <Languages className="h-4 w-4" />
      {lang === "en" ? "हिन्दी" : "English"}
    </Button>
  );
}
