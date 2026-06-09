import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import LayoutShell from '@/components/LayoutShell'

export const metadata: Metadata = {
  title: 'mrinal save',
  description: 'my digital archive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/images/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Monsieur+La+Doulaise&family=Figtree:wght@300;400&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        {/* Runs before React hydrates — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('theme') === 'dark') {
              document.documentElement.classList.add('dark');
              document.body.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <LayoutShell>
            {children}
          </LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
