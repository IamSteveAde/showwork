# Content page visual refresh

The Content planner now shares Overview typography, spacing, neutral surfaces and Showwork blue accents. Four workspace-total cards also filter the calendar and channel previews: All content, Internal review, Client review and Publishing. Stage filtering uses the existing calendarWorkflow classification, including internal changes, client changes, drafts and publishing states. Existing search/platform/type/category/content filters combine with this filter; clearing filters resets it too.

Post tiles are now flat, readable cards with media, idea/title, platform, time and workflow status. The same post-detail opening, deletion confirmation and mutation routes remain. Each weekday has a distinct coordinated accent, soft tinted cells and matching add-post controls; today has a stronger outline. Mobile keeps its agenda. Auto-publish remains visible with optional expandable explanatory text. Import, reset and theme switching are exposed directly in a wrapping toolbar; import/reset retain their native modal dialogs. New-post modal layering is above the refreshed workspace header.

No database, environment or VPS changes. Redeploy the website to release. Test real desktop/mobile layouts, dark mode, opening/saving posts, native Import/Reset dialogs and keyboard behaviour before production release.

Validation: 16 stage/workflow/navigation tests passed and stylesheet syntax checked. Broader checks also encountered existing failures in auto-publish-settings (approval fixture returned 404 instead of 200) and calendar-import-navigation (expected action absent). Their tested implementation files were unchanged by this UI work. No publishing or import API changes were made to address unrelated failures.
