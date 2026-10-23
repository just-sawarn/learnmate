// After `next build`, assemble a self-contained, runnable folder at .output/ for hosts that expect a built output
// directory and an entry file (.output/server/index.mjs). `next start` and the usual .next folder keep working too.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const out = path.join(root, ".output");

if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("package-output: .next/standalone/server.js is missing. Is `output: \"standalone\"` set in next.config.ts?");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
cpSync(standalone, out, { recursive: true });
// The standalone server serves static files and public assets from next to itself, so copy them in.
cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
if (existsSync(path.join(root, "public"))) cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });

mkdirSync(path.join(out, "server"), { recursive: true });
writeFileSync(
  path.join(out, "server", "index.mjs"),
  `// Entry point: starts the Next.js server. PORT is set by the host.
// Many hosts set HOSTNAME to the container's own name, which would make Next listen on that name only; bind to all interfaces instead.
process.env.HOSTNAME = process.env.BIND_HOST || "0.0.0.0";
process.env.PORT = process.env.PORT || "3000";
await import("../server.js");
`,
);
console.log("package-output: wrote .output (start it with: node .output/server/index.mjs)");
