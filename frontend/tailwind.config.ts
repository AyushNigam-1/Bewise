import type { Config } from "tailwindcss";

export default {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            animation: {
                'spin-slow': 'spin 2s linear infinite',
                'bounce-slow': 'bounce 4s infinite',
            },
            fontFamily: {
                mulish: [
                    "Mulish",
                    "sans-serif"
                ],
            },
            colors: {
                customGray: "rgba(154, 154, 154, 0.44)",
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        require("tailwind-scrollbar")({ nocompatible: true }),
        require("@tailwindcss/typography")
    ]
} satisfies Config;