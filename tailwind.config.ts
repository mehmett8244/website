import type { Config } from "tailwindcss";
export default { darkMode: ["class"], content: ["./src/**/*.{ts,tsx}"],
 theme: { extend: { colors: { bg: "var(--bg)", card: "var(--card)", accent: "var(--accent)", on: "var(--on)", ink: "var(--ink)", line: "var(--line)" },
 fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] } } }, plugins: [] } satisfies Config;
