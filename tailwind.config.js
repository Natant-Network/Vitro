/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js,css}"],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [{
    pattern: /(bg|text|border)-[a-z0-9]+/,
  }]
}