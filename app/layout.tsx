import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://helloai.com'),
  title: {
    default: 'Hello, AI — Your Unbiased Guide to the World\'s Smartest AIs',
    template: '%s | Hello, AI',
  },
  description:
    'Compare the leading AI models — Claude, Gemini, GPT, Grok — with honest leaderboards, weekly analysis, and one-click access. No hype, just real talk.',
  keywords: [
    'AI comparison', 'AI leaderboard', 'Claude', 'Gemini', 'GPT',
    'Grok', 'AI chatbot', 'best AI model', 'LLM comparison',
  ],
  authors: [{ name: 'Clement Machado', url: 'https://x.com/MachadoClement' }],
  creator: 'Clement Machado',
  alternates: {
    canonical: 'https://helloai.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://helloai.com',
    siteName: 'Hello, AI',
    title: 'Hello, AI — Your Unbiased Guide to the World\'s Smartest AIs',
    description:
      'Compare Claude, Gemini, GPT, and Grok with honest weekly leaderboards, cost data, and task-specific recommendations. No hype, just real benchmarks.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello, AI — Your Unbiased Guide to the World\'s Smartest AIs',
    description:
      'Compare Claude, Gemini, GPT, and Grok with honest weekly leaderboards, cost data, and task-specific recommendations. No hype, just real benchmarks.',
    creator: '@MachadoClement',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Hello, AI',
              url: 'https://helloai.com',
              description: 'Your unbiased guide to the world\'s smartest AIs',
              author: {
                '@type': 'Person',
                name: 'Clement Machado',
                url: 'https://x.com/MachadoClement',
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
