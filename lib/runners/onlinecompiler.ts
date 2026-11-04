import { serverEnv } from "@/lib/env";
import type { Language, RunResult } from "@/lib/schemas/exercise";

export type ServerLanguage = Extract<Language, "c" | "cpp" | "java" | "go" | "rust">;

/** Compiler ids from https://onlinecompiler.io/docs/compilers */
export const COMPILERS: Record<ServerLanguage, string> = {
  c: "gcc-15",
  cpp: "g++-15",
  java: "openjdk-25",
  go: "go-1.26",
  rust: "rust-1.93",
};

/** Per-run wall limit sent to the API (it enforces 30 s at most and a fixed 512 MB memory cap). */
export const TIME_LIMIT_SECONDS = 5;
const RETRY_DELAY_MS = 1200;

export class RunnerUnavailableError extends Error {
  constructor(detail: string) {
    super(`The code runner is unreachable right now (${detail}). Try again in a moment.`);
    this.name = "RunnerUnavailableError";
  }
}

interface RunCodeResponse {
  output?: string;
  error?: string;
  status?: "success" | "error";
  exit_code?: number | null;
  signal?: number | null;
  time?: string | null;
}

export function toRunResult(r: RunCodeResponse): RunResult {
  const exitCode = r.exit_code ?? (r.status === "success" ? 0 : 1);
  const timedOut = exitCode === 124;
  const oom = exitCode === 137;
  return {
    stdout: r.output ?? "",
    stderr: timedOut
      ? "Time limit exceeded. Check for an infinite loop."
      : oom
        ? "Memory limit exceeded."
        : (r.error ?? ""),
    exitCode,
    durationMs: Math.round(Number(r.time ?? 0) * 1000),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs one program on onlinecompiler.io. Retries once on 429 (the free plan allows 2 concurrent runs). */
export async function runOnCompiler(
  language: ServerLanguage,
  source: string,
  stdin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RunResult> {
  const env = serverEnv();
  if (!env.ONLINECOMPILER_API_KEY)
    throw new Error(
      "Running this language needs ONLINECOMPILER_API_KEY, which isn't set on the server.",
    );
  const url = `${env.ONLINECOMPILER_URL.replace(/\/$/, "")}/api/run-code-sync/`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: env.ONLINECOMPILER_API_KEY, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(35_000),
        body: JSON.stringify({
          compiler: COMPILERS[language],
          code: source,
          input: stdin,
          time_limit: TIME_LIMIT_SECONDS,
        }),
      });
    } catch (error) {
      throw new RunnerUnavailableError(error instanceof Error ? error.message : "network error");
    }
    if (response.status === 429 && attempt === 0) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      throw new RunnerUnavailableError("the runner rejected our API key");
    }
    if (!response.ok) throw new RunnerUnavailableError(`HTTP ${response.status}`);
    return toRunResult((await response.json()) as RunCodeResponse);
  }
  throw new RunnerUnavailableError("the runner is busy");
}
