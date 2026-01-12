import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Safelist ensures dynamically-generated classes aren't purged
  safelist: [
    "poster-skin-clean",
    "poster-skin-paper",
    "poster-skin-grain",
  ],
  theme: {
  	extend: {
  		colors: {
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
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
        fontFamily: {
            sans: [
              'var(--font-manrope)',
              'system-ui',
              '-apple-system',
              'BlinkMacSystemFont',
              'sans-serif',
            ],
            display: [
              'var(--font-bebas)',
              'Impact',
              'Arial Black',
              'sans-serif',
            ],
            mono: [
              'var(--font-mono)',
              'JetBrains Mono',
              'SF Mono',
              'Monaco',
              'monospace',
            ],
          },
          animation: {
            'slide-in': 'slideIn 0.2s ease-out',
            'stagger-in': 'staggerIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
            'bounce-soft': 'bounceSoft 0.5s ease-in-out',
            'fade-in': 'fadeIn 0.3s ease-out',
            'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          },
          keyframes: {
            slideIn: {
              '0%': { transform: 'translateY(-10px)', opacity: '0' },
              '100%': { transform: 'translateY(0)', opacity: '1' },
            },
            staggerIn: {
              '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
              '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
            },
            pulseGlow: {
              '0%, 100%': {
                boxShadow: '0 0 10px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.15)',
              },
              '50%': {
                boxShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.25)',
              },
            },
            bounceSoft: {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.05)' },
            },
            fadeIn: {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' },
            },
            scaleIn: {
              '0%': { opacity: '0', transform: 'scale(0.9)' },
              '100%': { opacity: '1', transform: 'scale(1)' },
            },
          },
          boxShadow: {
            'stage': '0 4px 6px -1px hsl(var(--shadow-stage) / 0.15), 0 10px 20px -5px hsl(var(--shadow-stage) / 0.2), 0 20px 30px -10px hsl(var(--shadow-stage) / 0.15)',
            'stage-lg': '0 10px 15px -3px hsl(var(--shadow-stage) / 0.2), 0 20px 40px -10px hsl(var(--shadow-stage) / 0.25), 0 30px 60px -15px hsl(var(--shadow-stage) / 0.2)',
            'glow-red': '0 0 20px hsl(var(--glow-red) / 0.3), 0 0 40px hsl(var(--glow-red) / 0.15)',
            'glow-amber': '0 0 20px hsl(var(--glow-amber) / 0.3), 0 0 40px hsl(var(--glow-amber) / 0.15)',
            'glow-cyan': '0 0 20px hsl(var(--glow-cyan) / 0.3), 0 0 40px hsl(var(--glow-cyan) / 0.15)',
          },
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

