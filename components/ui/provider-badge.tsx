import { cn } from "@/lib/utils";

export type Provider = "gemini" | "claude" | "groq" | "elevenlabs";

const STYLES: Record<Provider, { label: string; className: string }> = {
  gemini: { label: "Gemini", className: "" },
  claude: { label: "Claude", className: "" },
  groq: { label: "Groq", className: "" },
  elevenlabs: { label: "ElevenLabs", className: "" },
};

/** Small chip shown on every AI response so the routing is visible. */
export function ProviderBadge({ provider, note }: { provider: Provider; note?: string }) {
  const s = STYLES[provider];
  return (
    <span
      title={note}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground",
        s.className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
      {s.label}
      {note ? ` · ${note}` : ""}
    </span>
  );
}
