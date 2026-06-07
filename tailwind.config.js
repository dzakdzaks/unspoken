/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Surface
        canvas: "#0a0a0a",
        "surface-soft": "#121212",
        "surface-card": "#1a1a1a",
        "surface-elevated": "#242424",
        hairline: "#2a2a2a",
        "hairline-strong": "#3a3a3a",
        // Brand — electric yellow
        primary: {
          DEFAULT: "#faff69",
          active: "#e6eb52",
          disabled: "#3a3a1f",
        },
        "on-primary": "#0a0a0a",
        // Text
        ink: "#ffffff",
        body: "#cccccc",
        "body-strong": "#e6e6e6",
        muted: "#888888",
        "muted-soft": "#5a5a5a",
        // Semantic accents
        "accent-emerald": "#22c55e",
        "accent-rose": "#ef4444",
        "accent-blue": "#3b82f6",
        urgency: {
          1: "#22c55e",
          2: "#86efac",
          3: "#f59e0b",
          4: "#ef4444",
          5: "#dc2626",
        },
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
      },
      keyframes: {
        "thinking-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-5px)", opacity: "1" },
        },
        blink: {
          "0%, 45%": { opacity: "1" },
          "55%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "thinking-bounce": "thinking-bounce 1.1s ease-in-out infinite",
        "thinking-bounce-delay-1":
          "thinking-bounce 1.1s ease-in-out 0.18s infinite",
        "thinking-bounce-delay-2":
          "thinking-bounce 1.1s ease-in-out 0.36s infinite",
        blink: "blink 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
