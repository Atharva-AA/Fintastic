/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f1f3f6',       // Darker main background (was #f6f9fc)
        glass: 'rgba(248,249,251,0.75)', // Slightly darker glass
        primary: '#635bff',
        text: '#0f172a',             // Deeper primary text (was #0a2540)
        border: '#d6dbe3',           // Darker border (was #e6ebf1)
        success: '#00d924',
        warning: '#ffb020',
        // Pastel color palette (10-12% darker for charts/progress)
        pastel: {
          beige: '#f1f3f6',          // Darker beige (was #faf8f5)
          cream: '#f8f9fb',          // Darker cream (was #fefcf8)
          green: '#c2e0c3',          // 12% darker for charts (was #d4ecd5)
          orange: '#f5c5a8',         // 12% darker for charts (was #ffd4ba)
          blue: '#b8d9f0',           // 12% darker for charts (was #cce5f9)
          tan: '#ddc4a8',            // 12% darker for charts (was #ead4ba)
          sky: '#c2dce8',            // 12% darker for charts (was #d4e8f0)
        },
        // AI section background (darker & more consistent)
        ai: {
          bg: '#edf0f4',             // Darker AI background (was #f2f4f8)
          border: '#d1d7e0',         // Darker AI border (was #e1e5eb)
        },
        // Sidebar colors (darker tones)
        sidebar: {
          bg: '#f3f5f9',             // Darker sidebar background
          active: '#e1e6ef',         // Darker active tab background
        },
        // Muted text
        muted: '#4b5563',            // Darker muted text (was #6b7280)
      },
      borderRadius: {
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06)',      // 10% stronger
        'soft-lg': '0 4px 20px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.07)', // 10% stronger
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
