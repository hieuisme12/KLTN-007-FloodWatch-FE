/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        4.5: '1.125rem'
      },
      fontSize: {
        md: ['1rem', { lineHeight: '1.5rem' }]
      },
      colors: {
        primary: '#ffffff',
        primary_hover: '#f9fafb',
        secondary: '#374151',
        secondary_hover: '#1f2937',
        fg: {
          quaternary: '#98a2b3',
          quaternary_hover: '#667085'
        }
      },
      ringColor: {
        primary: '#d0d5dd'
      },
      outlineColor: {
        brand: 'hsl(var(--fs-color-primary))'
      },
      boxShadow: {
        xs: '0px 1px 2px rgba(0, 0, 0, 0.05)',
        skeuomorphic:
          '0px 0px 0px 1px rgba(0, 0, 0, 0.18) inset, 0px -2px 0px 0px rgba(0, 0, 0, 0.05) inset'
      },
      keyframes: {
        guestOverlayIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        guestModalIn: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        guestBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' }
        }
      },
      animation: {
        'guest-overlay': 'guestOverlayIn 0.2s ease',
        'guest-modal': 'guestModalIn 0.3s ease',
        'guest-bounce': 'guestBounce 0.6s ease'
      }
    }
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('selected', '&[data-selected]');
      addVariant('group-selected', ':merge(.group)[data-selected] &');
    })
  ]
};

