export type Provider = "gemini" | "claude" | "groq" | "elevenlabs";

/**
 * Model names are no longer shown anywhere in the interface, so this renders nothing. The component
 * and its props are kept so every screen that imports it keeps working.
 */
export function ProviderBadge(props: { provider: Provider; note?: string }) {
  void props;
  return null;
}
