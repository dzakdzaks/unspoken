/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        urgency: {
          1: "#22c55e",
          2: "#86efac",
          3: "#f59e0b",
          4: "#ef4444",
          5: "#dc2626",
        },
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
