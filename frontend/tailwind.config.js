/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Instrument Serif'", "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        critical: "#ff5d5d",
        high: "#ff9a52",
        medium: "#f0c94a",
        low: "#6db3ff",
        info: "#8a8a8a",
        safe: "#4ade80",
        warning: "#f0c94a",
        danger: "#ff5d5d",
      },
    },
  },
  plugins: [],
};
