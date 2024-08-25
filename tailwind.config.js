/** @type {import('tailwindcss').Config} */
export default {
  content: ["./views/**/**.edge"],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
};
