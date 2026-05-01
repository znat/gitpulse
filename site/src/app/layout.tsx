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
import './globals.css';

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

export const metadata: Metadata = {
  title: 'gitpulse',
  description: "Editorial story feed for your repo's PRs and direct pushes.",
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

  return (
    <html lang="en" data-theme="light" data-font="nyt">
      <body className={fontVariables}>{children}</body>
    </html>
  );
}
