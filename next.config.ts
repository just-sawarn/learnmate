import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server (traced dependencies included) that scripts/package-output.mjs copies to .output/ for hosts
  // that deploy a built folder and start an entry file.
  output: "standalone",
  // The production build type-checks the app only (see tsconfig.build.json), so it needs no dev-only packages.
  typescript: { tsconfigPath: "tsconfig.build.json" },
  // pdfjs locates its own worker file at runtime, which breaks when the bundler inlines it.
  serverExternalPackages: ["pdfjs-dist"],
  // The worker file is loaded by path at runtime, so tracing can't see it: include it in deployments.
  outputFileTracingIncludes: { "/api/ingest": ["./node_modules/pdfjs-dist/legacy/build/**"] },
};

export default nextConfig;
