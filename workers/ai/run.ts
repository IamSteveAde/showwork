export {};

/** Validate explicit startup before loading any application environment loaders. */
async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--run") {
    throw new Error("AI_WORKER_EXPLICIT_RUN_REQUIRED");
  }
  for (const name of ["DATABASE_URL", "OPENAI_API_KEY"]) {
    if (!process.env[name]) throw new Error(`Missing required AI worker variable: ${name}`);
  }
  const { runAiWorker } = await import("./worker");
  await runAiWorker();
}
void main().catch(() => {
  console.error("AI_WORKER_START_FAILED: supply --run and configure database and OpenAI environment variables");
  process.exitCode = 1;
});
