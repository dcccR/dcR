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
        sans: ["Archivo", "Iansui", "system-ui", "sans-serif"],
        narrow: ["Archivo Narrow", "Archivo", "Iansui", "sans-serif"],
        mono: ["IBM Plex Mono", "Iansui", "ui-monospace", "monospace"],
      },
      maxWidth: { app: "1080px" },
    },
  },
  plugins: [],
};
