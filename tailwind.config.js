/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Los tonos reales se definen en src/index.css (uno por tema)
        amber: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [
            n,
            `rgb(var(--amber-${n}) / <alpha-value>)`,
          ])
        ),
      },
    },
  },
  plugins: [],
}
