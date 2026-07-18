// Next.js's built-in loading-state convention: this renders automatically
// the instant someone navigates to any page whose data is still being
// fetched — no manual click listeners needed. One file at the app root
// covers every route in the site, since more specific loading.tsx files
// (if any existed in subfolders) would only override this locally.
export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "#0A0A0A",
      }}
    >
      <style>{`
        @keyframes showwork-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes showwork-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{ position: "relative", width: 56, height: 56 }}>
        {/* faint full ring, always visible */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            border: "3px solid rgba(245,200,66,0.15)",
          }}
        />
        {/* the actual spinning gold arc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            border: "3px solid transparent",
            borderTopColor: "#F5C842",
            borderRightColor: "#F5C842",
            animation: "showwork-spin 0.9s linear infinite",
          }}
        />
      </div>

      <p
        style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          animation: "showwork-pulse 1.6s ease-in-out infinite",
        }}
      >
        Show<span style={{ color: "#F5C842" }}>work</span>
      </p>
    </div>
  );
}