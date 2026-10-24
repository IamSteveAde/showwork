import { build } from "esbuild";

await build({
  entryPoints: ["workers/ai/run.ts"],
  bundle: true, platform: "node", target: "node22", format: "cjs",
  packages: "external", outfile: "dist-ai-worker/run.cjs", tsconfig: "tsconfig.json",
});
console.log("AI_WORKER_BUILD_OK");
