import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
	darkMode: ['class'],
	content: [
		'./public/*.html',
		'./app/helpers/**/*.rb',
		'./app/frontend/**/*.{js,ts,jsx,tsx,vue,svelte}',
		'./app/views/**/*.{erb,haml,html,slim}'
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter var', ...defaultTheme.fontFamily.sans]
			},
			borderRadius: {
				xl: 'min(calc(var(--radius) + 4px), var(--radius))',
				lg: 'min(calc(var(--radius) + 2px), var(--radius))',
				md: 'min(calc(var(--radius) - 2px), var(--radius))',
				DEFAULT: 'var(--radius)',
				sm: 'min(calc(var(--radius) - 4px), var(--radius))'
			},
			colors: {
				base: {
					50: "hsl(var(--base-50))",
					100: "hsl(var(--base-100))",
					200: "hsl(var(--base-200))",
					300: "hsl(var(--base-300))",
					400: "hsl(var(--base-400))",
					500: "hsl(var(--base-500))",
					600: "hsl(var(--base-600))",
					700: "hsl(var(--base-700))",
					800: "hsl(var(--base-800))",
					900: "hsl(var(--base-900))",
					950: "hsl(var(--base-950))",
					1000: "hsl(var(--base-1000))",
				},
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				shine: {
					'0%': { backgroundPosition: '200% 0' },
					'25%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '-200% 0' },
				},
				'grid-retro': {
					"0%": { transform: "translateY(-50%)" },
					"100%": { transform: "translateY(0)" },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				shine: 'shine 3s ease-out infinite',
				'grid-retro': "grid-retro 15s linear infinite"
			}
		}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
		require('@tailwindcss/container-queries'),
		require("tailwindcss-animate"),
		require('tailwindcss-motion'),
		plugin(({ addUtilities }) => {
			addUtilities({
				".field-sizing-content": {
					"field-sizing": "content",
				},
			});
		}),
	]
}
