# AI generation on the VPS

The deployed web app only authenticates requests, queues AiGenerationJob rows,
and polls their status. The VPS runs the model call and saves drafts. There is
no Netlify background function, HTTP dispatch, or public worker endpoint.
Local `npm run dev` keeps synchronous generation.

## Deployment

1. Apply the additive migration against the shared production database with
   `npx prisma migrate deploy`. The migration adds AiGenerationJob only.
2. Install the updated repository and dependencies on the VPS. Run
   `npx prisma generate` there to generate its Linux database client, then
   `npm run ai-worker:build`.
3. Create `/etc/showwork/ai-worker.env` outside the repository, owned by root
   with mode 0600. Supply DATABASE_URL, DIRECT_URL and OPENAI_API_KEY. The
   database must be the same one the web app uses. OPENAI_MODEL is optional.
   Do not copy unrelated website or publishing credentials.
4. Review paths in `deploy/vps/showwork-ai.service`, then install the unit in
   `/etc/systemd/system/showwork-ai.service`. With administrator access, run
   `systemctl daemon-reload` and `systemctl enable --now showwork-ai`.
5. Redeploy the web app. All production generation requests now queue for the
   VPS; ensure the worker is running before making requests.
6. Submit a batch and verify the POST returns 202, status polling eventually
   returns 200, and drafts are available for review. Check worker status with
   `systemctl status showwork-ai` and logs with `journalctl -u showwork-ai`.

These are installation instructions, not evidence of a deployed or active
service. No production migration or VPS service change is performed by the
local build.

## Runtime

The worker runs one job at a time, checking the queue every two seconds. An
atomic claim prevents concurrent processes from executing the same job twice.
Permissions, billing and AI allowance are checked again before generation.
Normal generation failures restore allowance through the existing service.
SIGTERM stops admission and lets the active call finish before disconnecting.

Queued jobs expire after 15 minutes. An interrupted RUNNING job is never
automatically replayed because drafts may already exist; the page reports an
interruption after 16 minutes and asks the user to check drafts before retrying.
No existing publishing worker, schedule or publishing activation gate changes.
The separately enabled canonical application integration continues to own its
existing request path.
