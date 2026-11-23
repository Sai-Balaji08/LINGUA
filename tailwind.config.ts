import type { Config } from "tailwindcss";

const withVar = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: withVar("paper"),
        surface: withVar("surface"),
        sunk: withVar("sunk"),
        ink: withVar("ink"),
        mute: withVar("mute"),
        line: withVar("line"),
        cobalt: { DEFAULT: withVar("cobalt"), soft: withVar("cobalt-soft") },
        saffron: { DEFAULT: withVar("saffron"), soft: withVar("saffron-soft") },
        mint: { DEFAULT: withVar("mint"), soft: withVar("mint-soft") },
        coral: { DEFAULT: withVar("coral"), soft: withVar("coral-soft") },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Figtree"', "system-ui", "sans-serif"],
        script: [
          '"Noto Sans Devanagari"',
          '"Noto Sans JP"',
          '"Noto Sans Arabic"',
          '"Noto Sans SC"',
          '"Bricolage Grotesque"',
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: { bubble: "1.75rem 1.75rem 1.75rem 0.4rem" },
      boxShadow: {
        lift: "0 1px 0 rgb(var(--line)), 0 12px 32px -16px rgb(var(--ink) / 0.28)",
        press: "0 3px 0 rgb(var(--cobalt-deep))",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        pop: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: { pop: "pop 180ms ease-out both" },
    },
  },
  plugins: [],
};

export default config;
