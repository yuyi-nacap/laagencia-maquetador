import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#EEEDE8",
        ink: "#111111",
        "ink-soft": "#4A4A4A",
        "ink-mute": "#8A8A8A",
        rule: "#C4C2BC",
        accent: "#D9582B",
        "dot-blue": "#8FA9B3",
        "dot-beige": "#C7C5A8",
      },
      fontFamily: {
        halyard: ['"Halyard"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontWeight: {
        light: "300",
        regular: "400",
        medium: "500",
      },
    },
  },
  plugins: [],
};

export default config;
