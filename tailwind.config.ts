import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        brand: {
          50: "#effdf8",
          100: "#d8f8ea",
          500: "#20a979",
          600: "#14845f",
          700: "#116b50",
        },
      },
      boxShadow: { card: "0 1px 2px rgba(23,33,43,.08), 0 4px 14px rgba(23,33,43,.04)" },
    },
  },
  plugins: [],
};

export default config;
