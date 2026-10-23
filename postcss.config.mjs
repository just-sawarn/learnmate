// Tailwind v4 runs as a PostCSS plugin; both the Turbopack dev server and the webpack production build read this file.
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
