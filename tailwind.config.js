/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        rule: "var(--rule)",
        red: "var(--red)",
        blue: "var(--blue)",
        marker: "var(--marker)",
        green: "var(--green)",
      },
      fontFamily: {
        sans: ["Archivo", "Noto Sans TC", "system-ui", "sans-serif"],
        narrow: ["Archivo Narrow", "Archivo", "Noto Sans TC", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      maxWidth: { app: "1080px" },
    },
  },
  plugins: [],
};
