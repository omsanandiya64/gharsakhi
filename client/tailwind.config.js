/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gs: {
          'teal-900': '#0B3D3B',
          'teal-600': '#14807C',
          'teal-100': '#DCEFED',
          marigold: '#F2A007',
          'marigold-100': '#FDF0D6',
          sand: '#FBF8F3',
          ink: '#14211F',
          muted: '#6B7B79',
          online: '#22A45D',
          danger: '#D64545',
        },
      },
      fontFamily: {
        display: ['"Baloo Bhai 2"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '20px',
        xl: '26px',
        '2xl': '34px',
        '3xl': '44px',
      },
    },
  },
  plugins: [],
};
