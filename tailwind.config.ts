import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0d0f14",   // Midnight slate
          card: "#13161d",      // Card surface
          elevated: "#1a1d26",  // Elevated surface
          overlay: "#20232e",   // Overlay panels
        },
        primary: {
          DEFAULT: "#6366f1",   // Indigo
          hover: "#4f46e5",
          neon: "#8b5cf6",      // Violet
          glow: "#818cf8",      // Soft glow
        },
        accent: {
          DEFAULT: "#10b981",   // Emerald green
          cyan: "#06b6d4",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
        text: {
          primary: "#f1f3f9",   // Warm white
          secondary: "#d1d5db", // Light gray (gray-300)
          muted: "#9ca3af",     // Medium gray (gray-400) - meets WCAG AA 4.5:1
          faint: "#808a9d",     // Slate gray (gray-500) - significantly improved
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Outfit", "Inter", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
        "glass-border": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.06)",
        "glow-primary": "0 0 24px rgba(99, 102, 241, 0.2)",
        "glow-sm": "0 0 12px rgba(99, 102, 241, 0.15)",
        "card-hover": "0 12px 40px rgba(0, 0, 0, 0.5)",
        "float": "0 20px 60px rgba(0, 0, 0, 0.6)",
        "dock": "0 -2px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      backdropBlur: {
        xs: "4px",
      },
      animation: {
        "slide-in-left": "slideInLeft 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-out-left": "slideOutLeft 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "float-up": "floatUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
      keyframes: {
        slideInLeft: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideOutLeft: {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(-100%)", opacity: "0" },
        },
        floatUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
