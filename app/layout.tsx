import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fountain of Cali',
  description: 'Your daily strength and mobility plan',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Fountain of Cali', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
