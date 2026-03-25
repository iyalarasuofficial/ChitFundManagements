/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tms: {
          primary: '#670FC5',
          'primary-dark': '#5a0db1',
          secondary: '#002866',
          'secondary-light': '#003580',
          'light-purple': '#F3EFFC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

