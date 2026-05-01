import type { Metadata } from 'next';
import {
  Playfair_Display,
  Literata,
  IBM_Plex_Mono,
  Old_Standard_TT,
  Source_Serif_4,
  Fraunces,
  Newsreader,
  Libre_Baskerville,
  Spectral,
  JetBrains_Mono,
  DM_Serif_Display,
  DM_Sans,
  DM_Mono,
  Cormorant_Garamond,
  Vollkorn,
} from 'next/font/google';
import { TopBar } from '@/components/TopBar';
import { Footer } from '@/components/Footer';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { loadRepo, publicationName } from '@/lib/repo';
import { JsonLd, buildWebSiteJsonLd } from '@/lib/json-ld';
import './globals.css';

// Inlined into <head> so the theme is applied before React hydrates,
// avoiding a flash of light theme on dark-system users.
const THEME_INIT_SCRIPT = `(function(){try{var k='gitpulse-preferences';var s=localStorage.getItem(k);var p=s?JSON.parse(s):null;var t=p&&p.theme?p.theme:'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.setAttribute('data-theme',r);document.documentElement.setAttribute('data-font','nyt');}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.setAttribute('data-font','nyt');}})();`;

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const oldStandardTT = Old_Standard_TT({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-old-standard',
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
  display: 'swap',
});

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-spectral',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const vollkorn = Vollkorn({
  subsets: ['latin'],
  variable: '--font-vollkorn',
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

// Match next.config.js basePath logic so the favicon resolves under
// /<repo>/ on GitHub Pages.
const REPO_BASE_PATH = process.env.GITHUB_REPOSITORY?.split('/')[1]
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}`
  : '';

export const metadata: Metadata = {
  title: 'gitpulse',
  description: "Editorial story feed for your repo's PRs and direct pushes.",
  icons: {
    icon: [{ url: `${REPO_BASE_PATH}/favicon.svg`, type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVariables = [
    playfairDisplay.variable,
    literata.variable,
    ibmPlexMono.variable,
    oldStandardTT.variable,
    sourceSerif4.variable,
    fraunces.variable,
    newsreader.variable,
    libreBaskerville.variable,
    spectral.variable,
    jetbrainsMono.variable,
    dmSerifDisplay.variable,
    dmSans.variable,
    dmMono.variable,
    vollkorn.variable,
    cormorantGaramond.variable,
  ].join(' ');

  const repo = loadRepo();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <JsonLd data={buildWebSiteJsonLd(repo)} />
      </head>
      <body className={fontVariables}>
        <ThemeProvider>
          <TopBar publicationName={publicationName(repo)} />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
