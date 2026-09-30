import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F5FBFF",
          100: "#ECFFF9",
          200: "#D9FFF5",
          300: "#7EF7D5",
          400: "#5CF2C8",
          500: "#46D8F0",
          600: "#22C7D8",
          700: "#0B6CFF",
          800: "#17456D",
          900: "#041B2D",
          950: "#06111F",
        },
        ink: {
          50: "#F5FBFF",
          100: "#ECFFF9",
          200: "#D9FFF5",
          300: "#8FACC8",
          400: "#5F7FA4",
          500: "#4B6B88",
          600: "#17456D",
          700: "#0C2036",
          800: "#06111F",
          900: "#041B2D",
        },
        mist: {
          300: "#D9FFF5",
          400: "#46D8F0",
          500: "#22C7D8",
          600: "#0B6CFF",
        },
        trust: {
          400: "#7EF7D5",
          500: "#5CF2C8",
          600: "#46D8F0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 36px rgba(34, 199, 216, 0.3)",
        soft: "0 20px 80px rgba(4, 27, 45, 0.28)",
        brand: "0 18px 40px rgba(4, 27, 45, 0.18)",
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at 18% 18%, rgba(92, 242, 200, 0.18), transparent 28%), radial-gradient(circle at 82% 16%, rgba(34, 199, 216, 0.16), transparent 26%), radial-gradient(circle at 68% 74%, rgba(11, 108, 255, 0.14), transparent 28%)",
        brandGlow:
          "radial-gradient(circle at top left, rgba(92, 242, 200, 0.18), transparent 35%), radial-gradient(circle at top right, rgba(34, 199, 216, 0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(11, 108, 255, 0.12), transparent 38%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -14px, 0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(-10px, 12px, 0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 10s ease-in-out infinite",
        drift: "drift 14s ease-in-out infinite",
        fadeUp: "fadeUp 0.8s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
