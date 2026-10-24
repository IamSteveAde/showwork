# Move the Showwork website to the VPS

The existing Docker worker does not serve the Next.js website or incoming
webhooks. Run the website separately; keep the worker running.

## Prepare before changing DNS

1. Inspect available memory, disk, Node version, firewall rules, and the worker's
   Docker volume mounts. Do not overwrite its checkout or environment.
2. Use a separate checkout at `/home/showwork/web`, owned by the `showwork`
   service user, from `useshowwork/showwork`, branch
   `development/vps-publishing`. Verify `/usr/local/bin/node` is the intended Node
   binary, or adjust the service's ExecStart path.
3. Copy the production website environment securely to `/etc/showwork/web.env`.
   Keep secrets out of Git and terminal output. Use systemd-compatible
   `KEY=value` entries without `export`. Set its ownership to `root:showwork`
   and mode to `0640`. The web process must use the same intended database,
   session secrets, storage configuration and Meta application credentials as
   the current production website. Set `NEXT_PUBLIC_APP_URL` to the existing
   canonical HTTPS address. Preserve any canonical database configuration.
4. Install dependencies with `npm ci` and build with `npm run build` as the
   service user, with the website environment available. Public Next.js
   environment variables must be present during the build. Do not copy macOS
   node_modules to Linux. Review database migrations separately; do not run
   `npm start`, whose prestart currently pushes the schema with accept-data-loss.
5. Install `deploy/vps/showwork-web.service` in `/etc/systemd/system/`, then run
   `systemctl daemon-reload` and `systemctl enable --now showwork-web`.
   Check `curl -I http://127.0.0.1:3000` and
   `journalctl -u showwork-web -n 100 --no-pager`.
6. Install Nginx and the supplied `showwork-web.nginx.conf` as a site, test with
   `nginx -t`, and reload Nginx. Allow HTTP/HTTPS through the active firewall
   without removing SSH access. Check routing before DNS changes:
   `curl -I -H 'Host: www.useshowwork.com' http://162.35.116.148`.
7. Obtain a trusted TLS certificate for both domain names before cutover. A DNS
   challenge can issue it while traffic still points to Vercel. Install the
   certificate and test HTTPS with curl's `--resolve` option. The supplied
   proxy file is HTTP bootstrap only; HTTPS must be configured separately.

## Cut over and verify

Change the apex and www DNS records to the VPS after HTTPS tests pass. Remove
conflicting A/AAAA/CNAME records for those names only; preserve email records.
Keep Vercel available for rollback during DNS propagation.

Verify login, storage uploads, APIs, OAuth callbacks and Meta webhook verification.
The Meta callback must point directly to the selected HTTPS webhook address
without a hostname redirect. Send a real incoming Instagram DM and watch:

```bash
journalctl -u showwork-web -f
```

Confirm that the message appears in the inbox and can be replied to. HTTP 200
alone does not prove a message was imported.

Review platform-scheduled jobs separately: moving Next.js does not move Vercel
or Netlify cron schedules. Avoid duplicate publishing schedulers; preserve the
existing worker's ownership and queues. Keep the VPS web process supervised
and monitor memory while building and running alongside the worker.

For later updates, build the next release before restarting the web service.
Never run the deployment's database migrations implicitly on every restart.
