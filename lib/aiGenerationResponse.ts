/** Hosting errors and login redirects can return HTML instead of API JSON. */
export async function readAiGenerationResponse(response: Response): Promise<Record<string, any>> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (response.status === 504 || response.status === 502) {
      throw new Error("The server could not finish AI generation. Check your drafts before trying again, then try a shorter date range or fewer platforms.");
    }
    if (response.redirected || response.status === 401) {
      throw new Error("Your session may have expired. Refresh the page and sign in again.");
    }
    throw new Error(`The server returned an unexpected response (HTTP ${response.status}). Check your drafts before retrying. If this continues, check the deployment's API logs.`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The server returned invalid generation data. Check your drafts before retrying.");
  }
  return data as Record<string, any>;
}

export async function waitForAiGeneration(calendarId: string, jobId: string) {
  // Allow up to 15 minutes queued, then the worker's processing window.
  const deadline = Date.now() + 32 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/ai-generate/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    const data = await readAiGenerationResponse(response);
    if (response.status === 202) continue;
    return { response, data };
  }
  throw new Error("Generation is taking longer than expected. Check your drafts before trying again.");
}
