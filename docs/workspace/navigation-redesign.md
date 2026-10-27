# Marketing Workspace navigation refresh

Shared workspace shell only: layered navy-to-Showwork-blue sticky header, simpler expanded navigation, existing persisted icon-only desktop mode, lighter page headings, and permission-filtered mobile bottom navigation. Primary mobile destinations are Home, Content and Inbox when available, followed by AI Studio and More. AI Studio opens a bottom sheet for permitted Knowledge, Research and Generate tools. More exposes the remaining permitted sections, client view, workspace switching and any supplied publishing action. Workspace settings remain in the header.

The shared MobileDrawer has an optional bottom placement; its default side placement, native dialog, focus handling, Escape dismissal, background scroll locking, breakpoint dismissal and reduced-motion classes remain. Sheets respect bottom safe-area insets and scroll internally. The page reserves room for the bottom bar. The bar is hidden during mobile inbox conversations and when the visual viewport indicates keyboard input. Full-screen editors remain above it through their existing modal layers. URL-driven section selection, OAuth return cleanup, kept-mounted panels, permissions and tour events are retained.

No database or environment changes; deploy the website to release. No VPS changes. This pass does not restyle the internals of analytics, content editing, knowledge or other individual tools.

Validation: eight workspace/navigation regression tests and source TypeScript checking. Still check real mobile Safari/Chrome keyboard transitions, safe-area spacing, sheet scrolling, inbox send controls, and desktop collapse/expand visually before a production release. No browser automation dependency is installed in this workspace.

The branded header preserves its 72px height and uses a workspace monogram, current-section pill and translucent secondary actions. Mobile uses the section label under the workspace name. Settings supports an optional onBrand appearance without changing its menu actions. Header surfaces do not clip the settings dropdown. No schema or infrastructure changes.
