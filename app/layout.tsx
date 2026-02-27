import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Literature Matrix - Powered by WisPaper',
  description: 'AI-powered academic paper search & structured extraction',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
