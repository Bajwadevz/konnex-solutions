import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./remotion/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f4efe6",
        muted: "#b7aa9a",
        bay: "#12100e",
        panel: "#1c1915",
        panel2: "#26211b",
        line: "rgba(244,239,230,0.12)",
        cadmium: "#ff4d1c",
        phosphor: "#e7ff4a",
      },
      fontFamily: {
        display: ["Bodoni Moda", "Didot", "serif"],
        sans: ["Schibsted Grotesk", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        lift: "0 24px 60px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
