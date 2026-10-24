export {};

/** Worker execution in site_v1 is disabled. All workers run from functions/. */
async function main() {
  if (process.env.SITE_V1_WORKER_ENABLED !== "true") {
    console.error("AI worker execution in site_v1 is disabled. All background workers run exclusively in the functions package (functions/workers/ai or functions/workers/bullmq).");
    process.exitCode = 1;
    return;
  }
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
