import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        "ironframe-processing-pulse": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.7", filter: "brightness(1.5)" },
        },
        "ironframe-verify-flash": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        /** Ironwatch (Agent 15) — outer glow “breathing” for Command Post telemetry (no layout metrics). */
        "ironwatch-pulse-breathe-slow": {
          "0%, 100%": { boxShadow: "0 0 6px rgba(245, 158, 11, 0.35)" },
          "50%": { boxShadow: "0 0 18px rgba(245, 158, 11, 0.72)" },
        },
        "ironwatch-pulse-breathe-fast": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(220, 38, 38, 0.42)" },
          "50%": { boxShadow: "0 0 24px rgba(220, 38, 38, 0.88)" },
        },
      },
      animation: {
        "pulse-amber": "ironframe-processing-pulse 0.4s ease-in-out infinite",
        "flash-green": "ironframe-verify-flash 0.6s ease-in-out forwards",
        "ironwatch-pulse-slow": "ironwatch-pulse-breathe-slow 2.8s ease-in-out infinite",
        "ironwatch-pulse-fast": "ironwatch-pulse-breathe-fast 1.15s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
