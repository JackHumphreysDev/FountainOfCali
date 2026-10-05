import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fountain of Cali',
  description: 'Your daily strength and mobility plan',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
