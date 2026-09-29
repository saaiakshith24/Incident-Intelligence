/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        claude: {
          bg: "#FAFAF8",
          surface: "#FFFFFF",
          text: "#242424",
          secondary: "#6B6B6B",
          muted: "#8A8A8A",
          border: "#E8E6E1",
          hover: "#F4F3EE",
          active: "#EFECE6",
        },
        status: {
          healthy: "#16A34A",
          healthyBg: "#F0FDF4",
          healthyBorder: "#BBF7D0",
          healthyText: "#166534",
          warning: "#D97706",
          warningBg: "#FFFBEB",
          warningBorder: "#FDE68A",
          warningText: "#92400E",
          critical: "#DC2626",
          criticalBg: "#FEF2F2",
          criticalBorder: "#FECACA",
          criticalText: "#991B1B",
          info: "#2563EB",
          infoBg: "#EFF6FF",
          infoBorder: "#BFDBFE",
          infoText: "#1E40AF",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace']
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 1px 4px 0 rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
