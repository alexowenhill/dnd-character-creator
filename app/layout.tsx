import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Character creator',
  description: 'Roll up a D&D 5e character for the campaign.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  )
}
