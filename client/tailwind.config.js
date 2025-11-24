/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                accent: '#0F172A',
                'input-bg': '#E6E9F2',
                'input-placeholder': '#AEBDDF',
                'progress-blue': '#5B8CFF',
                'text-light-blue': '#9CADD8',
                'site-bg': '#F7F9FF',
            }
        },
    },
    plugins: [],
}
