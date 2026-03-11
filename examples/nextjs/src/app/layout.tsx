import type { Metadata } from 'next'
import { clientEnv } from '@/env/client'

export const metadata: Metadata = {
  title: clientEnv.APP_TITLE,
  description: `Powered by ${clientEnv.APP_URL}`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
        {children}
      </body>
    </html>
  )
}
