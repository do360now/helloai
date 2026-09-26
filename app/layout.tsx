import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { websiteGraph } from '@/lib/structured-data';

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
    'Compare the leading AI models — Claude, Gemini, Grok, Qwen and Muse Spark — with LMArena Elo, cost and context data, weekly analysis, and one-click access.',
  keywords: [
    'AI comparison', 'AI leaderboard', 'Claude', 'Gemini', 'Qwen',
    'Grok', 'Muse Spark', 'AI chatbot', 'best AI model', 'LLM comparison',
  ],
  authors: [{ name: 'Clement Machado', url: 'https://x.com/helloaix' }],
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
      'Compare Claude, Gemini, Grok, Qwen and Muse Spark with weekly LMArena Elo, cost data, and task-specific recommendations. No hype.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello, AI — Your Unbiased Guide to the World\'s Smartest AIs',
    description:
      'Compare Claude, Gemini, Grok, Qwen and Muse Spark with weekly LMArena Elo, cost data, and task-specific recommendations. No hype.',
    creator: '@helloaix',
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
            __html: JSON.stringify(websiteGraph()),
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
