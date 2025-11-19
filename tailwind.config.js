/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      zIndex: {
        'dropdown': '100',
        'sticky': '900',
        'modal': '1000',
        'overlay': '1999',
        'sidebar': '2000',
        'menuButton': '2001',
        'popup': '3000',
        'chat': '3000',
        'toast': '4000',
        'imageViewer': '5000',
      },
      colors: {
        // Professional Cars-G Color Palette - Industry Standard Design System
        primary: {
          50: '#f7f9fb',   // Soft Off-White background
          100: '#e8f2ff',  // Light blue tint
          500: '#1E40AF',  // Primary Blue (Industry Standard)
          600: '#1E40AF',  // Primary Blue (matches spec)
          700: '#1e3a8a',  // Darker blue for active states
        },
        secondary: {
          100: '#e3f2fd',  // Light sky blue background
          500: '#64748B',  // Secondary Gray (Industry Standard)
          600: '#475569',  // Darker gray
        },
        accent: {
          500: '#10B981',  // Success Green (Industry Standard)
          600: '#059669',   // Darker green for hover
        },
        text: {
          primary: '#232937',   // Almost Black for main text
          secondary: '#607080', // Muted Gray-Blue for secondary text
        },
        // Status colors for reports - Industry Standard
        status: {
          resolved: '#10B981',    // Success Green
          'in-progress': '#F59E0B', // Warning Amber
          pending: '#64748B',     // Secondary Gray
          high: '#EF4444',        // Danger Red for high priority
          medium: '#F59E0B',      // Warning Amber for medium
          low: '#10B981',         // Success Green for low
        },
        // Emergency colors
        emergency: {
          bg: '#fff3e0',      // Light Orange background
          accent: '#f4511e',   // Deep Orange for icons/accents
          text: '#c62828',     // Strong Red for emergency numbers
          hover: '#e57373',    // Soft Red for hover states
        },
        // Industry Standard Color System
        success: {
          DEFAULT: '#10B981',  // Success Green
          light: '#34d399',
          dark: '#059669',
        },
        danger: {
          DEFAULT: '#EF4444',  // Danger Red
          light: '#f87171',
          dark: '#dc2626',
        },
        warning: {
          DEFAULT: '#F59E0B',  // Warning Amber
          light: '#fbbf24',
          dark: '#d97706',
        },
        info: {
          DEFAULT: '#06B6D4',  // Info Cyan
          light: '#22d3ee',
          dark: '#0891b2',
        },
        gray: {
          50: '#f7f9fb',   // Updated to match primary-50
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'sm': '0.25rem',   // 4px
        'md': '0.375rem',  // 6px
        'lg': '0.5rem',    // 8px
        'xl': '0.75rem',   // 12px
        '2xl': '1rem',     // 16px
      },
      spacing: {
        'xs': '0.25rem',   // 4px
        'sm': '0.5rem',    // 8px
        'md': '1rem',      // 16px
        'lg': '1.5rem',    // 24px
        'xl': '2rem',      // 32px
        '2xl': '3rem',     // 48px
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
