/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#FAF7F2",       // crema cálido
          text: "#2B2420",     // marrón carbón
          forest: "#1F4B3F",   // verde bosque profundo
          primary: "#C97A3E",  // terracota/ámbar
          secondary: "#8A7B68",// gris cálido
          positive: "#3D7A5C", // verde salvia
          negative: "#B5502E", // rojo terracota oscuro
        }
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      }
    },
  },
  plugins: [],
}
