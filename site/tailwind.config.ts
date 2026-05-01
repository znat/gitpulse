import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-primary)',
        'background-secondary': 'var(--bg-secondary)',
        'background-tertiary': 'var(--bg-tertiary)',
        'background-elevated': 'var(--bg-elevated)',
        foreground: 'var(--text-primary)',
        'foreground-secondary': 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-tertiary': 'var(--accent-tertiary)',
        positive: 'var(--positive)',
        negative: 'var(--negative)',
        warning: 'var(--warning)',
        'border-strong': 'var(--border-strong)',
        'border-medium': 'var(--border-medium)',
        'border-light': 'var(--border-light)',
        'border-subtle': 'var(--border-subtle)',
        'feed-gold': 'var(--feed-gold)',
        'feed-teal': 'var(--feed-teal)',
        'feed-dark': 'var(--bg-primary)',
        sidebar: 'var(--bg-sidebar)',
        'feed-text': 'var(--text-primary)',
        'feed-muted': 'var(--text-secondary)',
        'feed-border': 'var(--border-light)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
        'feed-display': 'var(--font-spectral), serif',
        'feed-sans': 'var(--font-dm-sans), sans-serif',
        'feed-vollkorn': 'var(--font-vollkorn), serif',
        'feed-body': 'var(--font-source-serif), serif',
        'feed-mono': 'var(--font-jetbrains-mono), monospace',
        'sidebar-display': 'var(--font-cormorant), serif',
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
      },
      transitionDuration: {
        theme: 'var(--transition)',
      },
    },
  },
  plugins: [],
};

export default config;
