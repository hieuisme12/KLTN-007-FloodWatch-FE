/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        guestOverlayIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        guestModalIn: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        guestBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      animation: {
        'guest-overlay': 'guestOverlayIn 0.2s ease',
        'guest-modal': 'guestModalIn 0.3s ease',
        'guest-bounce': 'guestBounce 0.6s ease',
      },
    },
  },
  plugins: [],
}

