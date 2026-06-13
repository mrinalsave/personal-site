import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import LayoutShell from '@/components/LayoutShell'

const siteUrl = 'https://www.mrinalsave.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'mrinal save',
    template: '%s | mrinal save',
  },
  description: 'my digital archive — art, projects, and thoughts by mrinal save.',
  icons: { icon: '/assets/images/favicon.ico' },
  alternates: { canonical: siteUrl },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'mrinal save',
    title: 'mrinal save',
    description: 'my digital archive — art, projects, and thoughts by mrinal save.',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'mrinal save',
  url: siteUrl,
  description: 'my digital archive — art, projects, and thoughts by mrinal save.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/blog?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Monsieur+La+Doulaise&family=Figtree:wght@300;400&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {/* Inline script runs synchronously before first paint — body exists here */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');document.body.classList.add('dark');}}catch(e){}` }} />
        <ThemeProvider>
          <LayoutShell>
            {children}
          </LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
