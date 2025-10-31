const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Web app
    join(__dirname, 'apps/web/{src,pages,components,app}/**/*.{ts,tsx,js,jsx}'),
    // Desktop app
    join(__dirname, 'apps/desktop/src/**/*.{ts,tsx,js,jsx,html}'),
    // Mobile app (web version)
    join(__dirname, 'apps/mobile/src/**/*.{ts,tsx,js,jsx}'),
    // All libraries
    join(__dirname, 'libs/**/*.{ts,tsx,js,jsx}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

