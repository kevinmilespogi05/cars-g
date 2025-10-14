/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      colors: {
        // Professional Cars-G Color Palette
        primary: {
          50: '#f7f9fb',   // Soft Off-White background
          100: '#e8f2ff',  // Light blue tint
          500: '#1a73e8',  // Google Blue (Primary Accent)
          600: '#1557b0',  // Darker blue for hover states
          700: '#0f4c8c',  // Even darker for active states
        },
        secondary: {
          100: '#e3f2fd',  // Light sky blue background
          500: '#69a1f4',  // Sky Blue (Secondary Accent)
          600: '#4285f4',  // Medium blue
        },
        accent: {
          500: '#1e8e3e',  // Trustworthy Green for buttons/highlights
          600: '#1b7c37',  // Darker green for hover
        },
        text: {
          primary: '#232937',   // Almost Black for main text
          secondary: '#607080', // Muted Gray-Blue for secondary text
        },
        // Status colors for reports
        status: {
          resolved: '#00897b',    // Teal
          'in-progress': '#fbc02d', // Golden Yellow
          pending: '#636e72',     // Muted Charcoal
          high: '#d32f2f',        // Vivid Red for high priority
          medium: '#fbc02d',      // Golden Yellow for medium
          low: '#0984e3',         // Soft Blue for low
        },
        // Emergency colors
        emergency: {
          bg: '#fff3e0',      // Light Orange background
          accent: '#f4511e',   // Deep Orange for icons/accents
          text: '#c62828',     // Strong Red for emergency numbers
          hover: '#e57373',    // Soft Red for hover states
        },
        // Keep existing colors for compatibility
        success: {
          DEFAULT: '#00897b',  // Updated to teal
          light: '#4db6ac',
          dark: '#00695c',
        },
        danger: {
          DEFAULT: '#d32f2f',  // Updated to vivid red
          light: '#ef5350',
          dark: '#c62828',
        },
        warning: {
          DEFAULT: '#fbc02d',  // Updated to golden yellow
          light: '#ffeb3b',
          dark: '#f57f17',
        },
        info: {
          DEFAULT: '#0984e3',  // Updated to soft blue
          light: '#29b6f6',
          dark: '#0277bd',
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
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
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
