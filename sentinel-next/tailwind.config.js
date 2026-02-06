/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                inter: ['var(--font-inter)', 'sans-serif'],
                orbitron: ['var(--font-orbitron)', 'sans-serif']
            },
            colors: {
                brand: {
                    400: '#1FE3FF'
                }
            }
        },
    },
    plugins: [],
};
