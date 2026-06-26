import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f7fb",
        ink: "#0f172a",
        muted: "#64748b",
        line: "#dbe3ef",
        brand: {
          50: "#f1f6ff",
          100: "#dbeafe",
          500: "#1d4ed8",
          600: "#1e40af",
          700: "#1d3b8b"
        },
        success: "#047857",
        warning: "#b45309",
        danger: "#b91c1c"
      },
      boxShadow: {
        panel: "0 10px 28px -24px rgba(15, 23, 42, 0.45)"
      },
      borderRadius: {
        xl: "1rem"
      },
      fontFamily: {
        sans: ["Noto Sans", "Segoe UI", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
