# Channels visual and capability refresh

Channels now uses a blue-accented introduction, local platform logos, light connection cards and a visible capability explanation for each integration. Cards describe publishing, analytics and messaging where implemented; WhatsApp describes Inbox, leads and enabled AI replies rather than social publishing or analytics. Descriptions state additional permission, account and setup requirements. They are capability descriptions, not fabricated live authorization results. Existing TikTok analytics access, Business Messaging and LinkedIn Page capability checks remain authoritative.

Existing connect/reauthorize/disconnect URLs, confirmation flows, OAuth callback handling, workspace permissions, Page selection, TikTok Business Messaging and WhatsApp credential input handling are preserved. Not-connected/loading badges are explicit. Management copy refers to channel-management permission. Instagram copy now acknowledges internal/client approval, auto-publish and required permissions rather than promising unconditional publishing.

No database migration, environment changes, scopes/token changes, API handler changes, provider calls, paid tests, deployment or VPS changes. Deploy the website to release.

Validation: 38 targeted Meta/TikTok OAuth, WhatsApp and navigation tests passed; all six cards server-rendered with local logos and capability descriptions; stylesheet and source TypeScript checks. A broader integration run had 103 passes and one existing failure in client revision/approval (fixture returns 404 instead of 200), in an unchanged API handler. Real-browser layout and end-to-end provider authorization remain unverified by this UI work.
