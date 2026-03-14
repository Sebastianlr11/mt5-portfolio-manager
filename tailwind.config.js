/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#060b12',
                surface:    '#0c1422',
                surface2:   '#111d2e',
                surface3:   '#162236',
                primary:    '#00d68f',
                secondary:  '#4a8ef5',
                error:      '#ef4444',
                success:    '#00d68f',
                warning:    '#f59e0b',
                muted:      '#64748b',
                text:       '#e2e8f0',
                border:     '#1e293b',
                border2:    '#2d4060',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            boxShadow: {
                'glow-green':  '0 0 20px rgba(0, 214, 143, 0.15)',
                'glow-blue':   '0 0 20px rgba(74, 142, 245, 0.15)',
                'glow-red':    '0 0 20px rgba(239, 68, 68, 0.12)',
                'card':        '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                'card-hover':  '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(0, 214, 143, 0.1)',
            },
            animation: {
                'fade-in':     'fadeIn 0.3s ease',
                'slide-up':    'slideUp 0.4s ease',
                'pulse-slow':  'pulse 3s infinite',
            },
            keyframes: {
                fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
            },
        },
    },
    plugins: [],
}
