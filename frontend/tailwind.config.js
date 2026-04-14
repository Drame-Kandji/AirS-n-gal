/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        critical: "#E74C3C",
        bad: "#E67E22",
        moderate: "#F39C12",
        good: "#2ECC71",
        excellent: "#27AE60",
        primary: "#2C3E50",
        secondary: "#3498DB",
        bg: "#F4F6F9",
        sidebar: "#1A252F",
        card: "#FFFFFF",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(20, 35, 50, 0.08)",
      },
      animation: {
        pulseSlow: "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
