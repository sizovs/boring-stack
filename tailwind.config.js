/** @type {import('tailwindcss').Config} */
export default {
  content: ["./views/**/**.edge", "./static/**/**.js"],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
};
