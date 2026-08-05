import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand tokens — usage: bg-brand-blue, text-brand-accent,
        // border-brand-offwhite/20, etc. Values are defined once in
        // globals.css as CSS variables; change them there and every
        // class below updates automatically, site-wide.
        //
        // brand.blue (light/DEFAULT/dark) is the dominant family —
        // reach for this first, always. brand.accent is the ONE
        // color allowed outside that family — sparing use only
        // (a badge, a divider, one standout button), never a second
        // default choice alongside blue.
        brand: {
          blue: {
            light: "var(--brand-blue-light)",
            DEFAULT: "var(--brand-blue)",
            dark: "var(--brand-blue-dark)",
          },
          accent: "var(--brand-accent)",
          black: "var(--brand-black)",
          ink: "var(--brand-ink)",
          charcoal: "var(--brand-charcoal)",
          offwhite: "var(--brand-offwhite)",
          "offwhite-card": "var(--brand-offwhite-card)",
        },
      },
      backgroundImage: {
        // Usage: bg-brand-gradient — the platform's signature blue
        // gradient, defined once here and in globals.css so it never
        // drifts out of sync between the two.
        "brand-gradient": "var(--brand-gradient)",
      },
      fontFamily: {
        // Usage: font-sans (this is Tailwind's default sans, so most
        // text won't need the class at all).
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;