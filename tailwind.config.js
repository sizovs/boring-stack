/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography"
import forms from "@tailwindcss/forms"
export default {
  content: ["./application/**/**.edge", "./static/**/**.js"],
  theme: {
    extend: {},
  },
  plugins: [typography, forms],
};
